import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import StatusActions from "@/components/encounter/StatusActions";
import AddNoteForm from "@/components/encounter/AddNoteForm";
import AddLabEntryForm from "@/components/encounter/AddLabEntryForm";
import LabPanel from "@/components/encounter/LabPanel";
import AddImagingForm from "@/components/encounter/AddImagingForm";
import AddReferralForm from "@/components/encounter/AddReferralForm";
import ReferralReview from "@/components/encounter/ReferralReview";
import AddTreatmentForm from "@/components/encounter/AddTreatmentForm";
import AddOperationForm from "@/components/encounter/AddOperationForm";
import FormRecords from "@/components/encounter/FormRecords";
import { requireSession, apiFetchServer } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { caseTypeDisplay } from "@/lib/constants";
import type { Encounter, Patient, ClinicalNote, LabPanel as LabPanelModel, ImagingRequest, ReferralConsult, TreatmentLog, OperationForm, DischargeForm } from "@/lib/models/types";

type EncounterDetail = {
  encounter: Encounter;
  patient: Patient | null;
  notes: (ClinicalNote & { authorName: string })[];
  labPanel: LabPanelModel | null;
  imaging: ImagingRequest[];
  referrals: ReferralConsult[];
  treatmentLog: TreatmentLog | null;
  operation: OperationForm | null;
  discharge: DischargeForm | null;
};

export default async function EncounterPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  if (!session) redirect("/login");

  const data = await apiFetchServer<EncounterDetail>(`/api/encounters/${params.id}`);
  if (!data) notFound();

  const { encounter, patient, notes, labPanel, imaging, referrals, treatmentLog, operation, discharge } = data;

  const statusTone = encounter.status === "active" ? "success" : encounter.status === "discharged" ? "info" : "warning";
  // Discharge, follow-up close, and operation forms are resident-only (spec §7).
  const canEditOperation = session.role === "resident";
  const canManageStatus = session.role === "resident";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <PageHeader
          title={patient?.fullName || "Patient"}
          subtitle={`${patient?.medicalNumber} · ${patient?.age} yrs · ${encounter.type} · ${caseTypeDisplay(encounter.caseType, encounter.customCaseTypeLabel)}`}
          action={<Badge tone={statusTone as any}>{encounter.status}</Badge>}
        />

        {encounter.status === "active" && canManageStatus && <StatusActions encounterId={encounter._id!.toString()} encounterType={encounter.type} />}

        <div className="flex flex-col gap-5 mt-5">
          {/* Clinical notes */}
          <Card title="Clinical notes">
            {notes.length === 0 ? (
              <EmptyState title="No notes yet." className="py-6 mb-3" />
            ) : (
              <ol className="flex flex-col gap-4 mb-4">
                {notes.map((n) => (
                  <li key={n._id!.toString()} className="border-l-2 border-primary/20 pl-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-primary uppercase">{n.context}</span>
                      <span className="text-xs text-muted">
                        {n.authorName || "Unknown"} · {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    {n.presentingLine && <p className="text-sm font-medium" dir="auto">{n.presentingLine}</p>}
                    {n.complaint?.main && (
                      <p className="text-sm text-ink/70 mt-1">Complaint: {n.complaint.main} ({n.complaint.duration})</p>
                    )}
                    {n.generalExam?.bp && (
                      <p className="text-sm text-ink/70 mt-1">BP {n.generalExam.bp} · HR {n.generalExam.hr}</p>
                    )}
                    {n.recommendation && (
                      <p className="text-sm text-ink/70 mt-1"><span className="font-medium">Rec:</span> {n.recommendation}</p>
                    )}
                    {n.treatmentOrders?.length > 0 && (
                      <p className="text-sm text-ink/70 mt-1" dir="auto">
                        <span className="font-medium">Orders:</span> {n.treatmentOrders.join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
            <AddNoteForm encounterId={encounter._id!.toString()} caseType={encounter.caseType} patientAge={patient?.age ?? 0} />
          </Card>

          {/* Lab panel */}
          <Card title="Lab results">
            <LabPanel results={labPanel?.results || []} presetTests={labPanel?.presetTests || []} />
            <AddLabEntryForm encounterId={encounter._id!.toString()} />
          </Card>

          {/* Imaging */}
          <Card title="Imaging requests">
            {imaging.length === 0 ? (
              <EmptyState title="No imaging requested." className="py-6 mb-3" />
            ) : (
              <ul className="flex flex-col divide-y divide-border mb-4">
                {imaging.map((im) => (
                  <li key={im._id!.toString()} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{im.modality}{im.modalityDetail ? ` (${im.modalityDetail})` : ""} — {im.partToBeExamined}</p>
                      {im.result ? (
                        <p className="text-xs text-muted mt-0.5">{im.result}</p>
                      ) : (
                        <p className="text-xs text-muted mt-0.5">{im.clinicalDiagnosis}</p>
                      )}
                    </div>
                    <Badge tone={im.status === "resulted" ? "success" : im.status === "scheduled" ? "info" : "default"}>
                      {im.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
            <AddImagingForm encounterId={encounter._id!.toString()} />
          </Card>

          {/* Referrals */}
          <Card title="Referrals / consults">
            {referrals.length === 0 ? (
              <EmptyState title="No referrals yet." className="py-6 mb-3" />
            ) : (
              <ul className="flex flex-col divide-y divide-border mb-4">
                {referrals.map((r) => (
                  <li key={r._id!.toString()} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{r.toSpecialty}</p>
                        <p className="text-xs text-muted mt-0.5">{r.reason} · {formatDate(r.referredAt)}</p>
                      </div>
                      <Badge tone={r.status === "reviewed" ? "success" : "warning"}>{r.status}</Badge>
                    </div>
                    <ReferralReview referral={r} />
                  </li>
                ))}
              </ul>
            )}
            <AddReferralForm encounterId={encounter._id!.toString()} />
          </Card>

          {/* Treatment log */}
          <Card title="Treatment log">
            {!treatmentLog || treatmentLog.entries.length === 0 ? (
              <p className="text-sm text-muted mb-3">No treatments logged.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border mb-4">
                {treatmentLog.entries.map((t, i) => (
                  <li key={i} className="py-2.5">
                    <p className="text-sm font-medium">{t.treatment}</p>
                    {t.otherRecommendations && (
                      <p className="text-xs text-muted mt-0.5">{t.otherRecommendations}</p>
                    )}
                    <p className="text-xs text-muted mt-0.5">{formatDate(t.date)}</p>
                  </li>
                ))}
              </ul>
            )}
            <AddTreatmentForm encounterId={encounter._id!.toString()} />
          </Card>

          {/* Operation */}
          <Card title="Operation record">
            {!operation ? (
              <div>
                <p className="text-sm text-muted mb-3">No operation recorded.</p>
                {canEditOperation && (
                  <AddOperationForm encounterId={encounter._id!.toString()} patientNo={patient?.medicalNumber || ""} />
                )}
              </div>
            ) : (
              <div>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <dt className="text-xs text-muted">Procedure</dt>
                  <dd className="font-medium">{operation.procedureName}</dd>
                  <dt className="text-xs text-muted">Date</dt>
                  <dd>{operation.date ? formatDate(operation.date) : ""}</dd>
                  <dt className="text-xs text-muted">Surgeon</dt>
                  <dd dir="auto">{operation.surgeonName || "Unknown"}</dd>
                  <dt className="text-xs text-muted">Assistants</dt>
                  <dd>{(operation.assistantNames || []).join(", ") || "—"}</dd>
                  <dt className="text-xs text-muted">Pre-op diagnosis</dt>
                  <dd>{operation.preOpDiagnosis}</dd>
                  <dt className="text-xs text-muted">Post-op diagnosis</dt>
                  <dd>{operation.postOpDiagnosis}</dd>
                  <dt className="text-xs text-muted">Anesthesia</dt>
                  <dd>{operation.anesthesiaType} — {operation.anesthetist}</dd>
                  <dt className="text-xs text-muted">EBL</dt>
                  <dd>{operation.estimatedBloodLoss}</dd>
                  <dt className="text-xs text-muted">Findings</dt>
                  <dd>{operation.findings}</dd>
                  <dt className="text-xs text-muted">Procedure details</dt>
                  <dd className="sm:col-span-1">{operation.procedureDetails}</dd>
                  <dt className="text-xs text-muted">Complications</dt>
                  <dd>{operation.complications || "None"}</dd>
                  <dt className="text-xs text-muted">Specimens</dt>
                  <dd>{operation.specimensSent.join(", ") || "None"}</dd>
                  <dt className="text-xs text-muted">Post-op plan</dt>
                  <dd className="sm:col-span-1">{operation.postOpPlan}</dd>
                </dl>
                {canEditOperation && (
                  <AddOperationForm
                    encounterId={encounter._id!.toString()}
                    patientNo={patient?.medicalNumber || ""}
                    existing={operation}
                  />
                )}
              </div>
            )}
          </Card>

          {/* Generic forms */}
          <Card title="Generic forms">
            <FormRecords encounterId={encounter._id!.toString()} />
          </Card>

          {/* Discharge */}
          {discharge && (
            <Card title="Discharge summary">
              <p className="text-sm text-ink/70">{discharge.summary}</p>
              <p className="text-xs text-muted mt-2">
                Discharged {formatDate(discharge.dischargeDate)}
                {discharge.followUpRequired ? ` · Follow-up: ${discharge.followUpInstructions || "required"}` : ""}
              </p>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
