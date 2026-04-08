// Dashboard — coordinator component.
// Owns all state; delegates rendering to DashboardLayout + page components.

import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { encryptFile } from "@/lib/encryption";
import { uploadToPinata } from "@/lib/pinata";
import { submitToHCS } from "@/lib/hedera";
import { useAppStore } from "@/store/appStore";
import { type MedicalRecord } from "@/components/RecordCard";
import { RecordPreviewModal } from "@/components/RecordPreviewModal";
import { loadRecords, addRecord } from "@/lib/recordStore";
import { DashboardLayout, type DashboardPage } from "@/components/DashboardLayout";
import { OverviewPage } from "@/components/dashboard/OverviewPage";
import { PatientsPage } from "@/components/dashboard/PatientsPage";
import { RecordsPage, type FormState, type UploadStatus } from "@/components/dashboard/RecordsPage";
import { ConsultPage } from "@/components/dashboard/ConsultPage";
import { ARIAPage } from "@/components/dashboard/ARIAPage";
import { type Patient, loadPatients, addPatient as persistPatient } from "@/lib/patientStore";
import { PatientProfilePage } from "@/components/dashboard/PatientProfilePage";

export function Dashboard() {
  const [, setLocation] = useLocation();
  const { hospitalName, walletAddress, userEmail, logout, hederaIdentity } = useAppStore();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState<DashboardPage>("overview");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleNavigate = (page: DashboardPage) => {
    setActivePage(page);
    if (page !== "patients") setSelectedPatient(null);
  };

  // ── Patients ─────────────────────────────────────────────────────────────────
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    if (hederaIdentity?.did) {
      const stored = loadPatients(hederaIdentity.did);
      if (stored.length > 0) setPatients(stored);
    }
  }, [hederaIdentity?.did]);

  const handleAddPatient = (patient: Patient) => {
    if (!hederaIdentity?.did) return;
    const updated = persistPatient(hederaIdentity.did, patient);
    setPatients(updated);
  };

  // ── Records ─────────────────────────────────────────────────────────────────
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [previewRecord, setPreviewRecord] = useState<MedicalRecord | null>(null);

  useEffect(() => {
    if (hederaIdentity?.did) {
      const stored = loadRecords(hederaIdentity.did);
      if (stored.length > 0) setRecords(stored);
    }
  }, [hederaIdentity?.did]);

  // ── Upload form ──────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({ patientName: "", recordTitle: "", file: null });
  const [status, setStatus] = useState<UploadStatus>({ type: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFormChange = (changes: Partial<FormState>) => {
    setForm((p) => ({ ...p, ...changes }));
    if (status.type !== "idle" && status.type !== "success") setStatus({ type: "idle" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.patientName.trim() || !form.recordTitle.trim()) return;

    try {
      setStatus({ type: "encrypting" });
      const { keyHex, ivHex, encryptedBytes } = await encryptFile(form.file).catch((err) => {
        throw new Error(`Encryption failed: ${err instanceof Error ? err.message : err}`);
      });

      setStatus({ type: "uploading-ipfs" });
      const ipfsCid = await uploadToPinata(encryptedBytes, form.file.name).catch((err) => {
        throw new Error(`IPFS upload failed: ${err instanceof Error ? err.message : err}`);
      });

      setStatus({ type: "sending-hcs" });
      const hcsTxId = await submitToHCS({
        patientName: form.patientName.trim(),
        recordTitle: form.recordTitle.trim(),
        ipfsCid,
        timestamp: new Date().toISOString(),
        ivHex,
        encrypted: true,
      }).catch((err) => {
        throw new Error(`Hedera HCS failed: ${err instanceof Error ? err.message : err}`);
      });

      const newRecord: MedicalRecord = {
        id: crypto.randomUUID(),
        patientName: form.patientName.trim(),
        recordTitle: form.recordTitle.trim(),
        ipfsCid,
        hcsTransactionId: hcsTxId,
        keyHex,
        ivHex,
        createdAt: new Date().toISOString(),
        fileName: form.file.name,
        mimeType: form.file.type || "application/octet-stream",
        patientDid: form.patientDid,
      };

      if (hederaIdentity?.did) {
        const updated = addRecord(hederaIdentity.did, newRecord);
        setRecords(updated);
      } else {
        setRecords((p) => [newRecord, ...p]);
      }

      setStatus({ type: "success", ipfsCid, hcsTxId, keyHex, ivHex });
      setForm({ patientName: "", recordTitle: "", file: null, patientDid: undefined });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: unknown) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "An unexpected error occurred." });
    }
  };

  const isLoading = ["encrypting", "uploading-ipfs", "sending-hcs"].includes(status.type);

  const loadingLabel =
    status.type === "encrypting"     ? "Encrypting file locally…" :
    status.type === "uploading-ipfs" ? "Uploading ciphertext to IPFS…" :
    status.type === "sending-hcs"    ? "Anchoring proof on Hedera HCS…" : "";

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  // ── Page renderer ────────────────────────────────────────────────────────────
  const renderPage = () => {
    switch (activePage) {
      case "overview":
        return (
          <OverviewPage
            records={records}
            hederaIdentity={hederaIdentity}
            hospitalName={hospitalName}
            userEmail={userEmail}
            walletAddress={walletAddress}
            onNavigate={handleNavigate}
          />
        );
      case "patients":
        if (selectedPatient) {
          return (
            <PatientProfilePage
              patient={selectedPatient}
              records={records}
              hospitalDid={hederaIdentity?.did ?? ""}
              onBack={() => setSelectedPatient(null)}
              onPreview={setPreviewRecord}
            />
          );
        }
        return (
          <PatientsPage
            patients={patients}
            records={records}
            onAddPatient={handleAddPatient}
            onSelectPatient={setSelectedPatient}
          />
        );
      case "records":
        return (
          <RecordsPage
            records={records}
            form={form}
            status={status}
            isLoading={isLoading}
            loadingLabel={loadingLabel}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            onPreview={setPreviewRecord}
            fileInputRef={fileInputRef}
            patients={patients}
          />
        );
      case "consult":
        return (
          <ConsultPage
            patients={patients}
            hospitalDid={hederaIdentity?.did ?? ""}
            hospitalName={hospitalName ?? "My Hospital"}
          />
        );
      case "aria":
        return <ARIAPage />;
    }
  };

  return (
    <>
      <DashboardLayout
        activePage={activePage}
        onNavigate={handleNavigate}
        hospitalName={hospitalName}
        hederaIdentity={hederaIdentity}
        walletAddress={walletAddress}
        onLogout={handleLogout}
      >
        {renderPage()}
      </DashboardLayout>

      <RecordPreviewModal record={previewRecord} onClose={() => setPreviewRecord(null)} />
    </>
  );
}
