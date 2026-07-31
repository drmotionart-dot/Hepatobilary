import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusActions from "@/components/encounter/StatusActions";
import AddNoteForm from "@/components/encounter/AddNoteForm";
import AddLabEntryForm from "@/components/encounter/AddLabEntryForm";
import AddImagingForm from "@/components/encounter/AddImagingForm";
import AddReferralForm from "@/components/encounter/AddReferralForm";
import AddTreatmentForm from "@/components/encounter/AddTreatmentForm";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireSession } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { Encounter, Patient, ClinicalNote, LabPanel, ImagingRequest, ReferralConsult, TreatmentLog, OperationForm, DischargeForm } from "@/lib/models/types";

export default async function EncounterPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const db = await getDb();

  let encounter: Encounter | null = null;
  try {
    encounter = await db.collection<Encounter>("encounters").findOne({ _id: new ObjectId(params.id) });
  } catch {
    encounter = null;
  }
  if (!encounter) notFound();

  const [patient, notes, labPanel, imaging, referrals, treatmentLog, operation, discharge] = await Promise.all([
    db.collection<Patient>("patients").findOne({ _id: encounter.patientId }),
    db.collection<ClinicalNote>("clinicalNotes").find({ encounterId: encounter._id }).sort({ createdAt: 1 }).toArray(),
    db.collection<LabPanel>("labPanels").findOne({ encounterId: encounter._id }),
    db.collection<ImagingRequest>("imagingRequests").find({ encounterId: encounter._id }).sort({ requestedAt: -1 }).toArray(),
    db.collection<ReferralConsult>("referralConsults").find({ encounterId: encounter._id }).sort({ referredAt: -1 }).toArray(),
    db.collection<TreatmentLog>("treatmentLogs").findOne({ encounterId: encounter._id }),
    db.collection<OperationForm>("operationForms").findOne({ encounterId: encounter._id }),
    db.collection<DischargeForm>("dischargeForms").findOne({ encounterId: encounter._id }),
  ]);

  const authorIds = [...new Set(notes.map((n) => n.authoredBy.toString()))];
  const authors = authorIds.length
    ? await db.collection("users").find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } }).toArray()
    : [];
  const authorMap = new Map(authors.map((a: any) => [a._id.toString(), a.fullName]));

  const statusTone = encounter.status === "active" ? "success" : encounter.status === "discharged" ? "info" : "warning";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <PageHeader
          title={patient?.fullName || "Patient"}
          subtitle={`${patient?.medicalNumber} · ${patient?.age} yrs · ${encounter.type} · ${encounter.caseType}`}
          action={<Badge tone={statusTone as any}>{encounter.status}</Badge>}
        />

        {encounter.status === "active" && <StatusActions encounterId={encounter._id!.toString()} />}

        <div className="flex flex-col gap-5 mt-5">
          {/* Clinical notes */}
          <Card title="Clinical notes">
            {notes.length === 0 ? (
              <p className="text-sm text-ink/50 mb-3">No notes yet.</p>
            ) : (
              <ol className="flex flex-col gap-4 mb-4">
                {notes.map((n) => (
                  <li key={n._id!.toString()} className="border-l-2 border-primary/20 pl-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-primary uppercase">{n.context}</span>
                      <span className="text-xs text-ink/40">
                        {authorMap.get(n.authoredBy.toString()) || "Unknown"} · {formatDateTime(n.createdAt)}
                      </span>
                    </div>
                    {n.presentingLine && <p className="text-sm font-medium">{n.presentingLine}</p>}
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
                      <p className="text-sm text-ink/70 mt-1">
                        <span className="font-medium">Orders:</span> {n.treatmentOrders.join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
            <AddNoteForm encounterId={encounter._id!.toString()} caseType={encounter.caseType} />
          </Card>

          {/* Lab panel */}
          <Card title="Lab results">
            {!labPanel || labPanel.results.length === 0 ? (
              <p className="text-sm text-ink/50 mb-3">No lab results yet.</p>
            ) : (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink/50 border-b border-black/10">
                      <th className="py-2 pr-3">Date</th>
                      <th className="py-2 pr-3">Category</th>
                      <th className="py-2 pr-3">Test</th>
                      <th className="py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labPanel.results.map((r, i) => (
                      <tr key={i} className="border-b border-black/5">
                        <td className="py-2 pr-3 whitespace-nowrap">{formatDate(r.date)}</td>
                        <td className="py-2 pr-3"><Badge>{r.category}</Badge></td>
                        <td className="py-2 pr-3 font-medium">{r.test}</td>
                        <td className="py-2">{r.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <AddLabEntryForm encounterId={encounter._id!.toString()} />
          </Card>

          {/* Imaging */}
          <Card title="Imaging requests">
            {imaging.length === 0 ? (
              <p className="text-sm text-ink/50 mb-3">No imaging requested.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-black/5 mb-4">
                {imaging.map((im) => (
                  <li key={im._id!.toString()} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{im.modality}{im.modalityDetail ? ` (${im.modalityDetail})` : ""} — {im.partToBeExamined}</p>
                      {im.result ? (
                        <p className="text-xs text-ink/60 mt-0.5">{im.result}</p>
                      ) : (
                        <p className="text-xs text-ink/40 mt-0.5">{im.clinicalDiagnosis}</p>
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
              <p className="text-sm text-ink/50 mb-3">No referrals yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-black/5 mb-4">
                {referrals.map((r) => (
                  <li key={r._id!.toString()} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.toSpecialty}</p>
                      <p className="text-xs text-ink/50 mt-0.5">{r.reason} · {formatDate(r.referredAt)}</p>
                    </div>
                    <Badge tone={r.status === "reviewed" ? "success" : "warning"}>{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
            <AddReferralForm encounterId={encounter._id!.toString()} />
          </Card>

          {/* Treatment log */}
          <Card title="Treatment log">
            {!treatmentLog || treatmentLog.entries.length === 0 ? (
              <p className="text-sm text-ink/50 mb-3">No treatments logged.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-black/5 mb-4">
                {treatmentLog.entries.map((t, i) => (
                  <li key={i} className="py-2.5">
                    <p className="text-sm font-medium">{t.treatment}</p>
                    {t.otherRecommendations && (
                      <p className="text-xs text-ink/50 mt-0.5">{t.otherRecommendations}</p>
                    )}
                    <p className="text-xs text-ink/40 mt-0.5">{formatDate(t.date)}</p>
                  </li>
                ))}
              </ul>
            )}
            <AddTreatmentForm encounterId={encounter._id!.toString()} />
          </Card>

          {/* Operation */}
          {operation && (
            <Card title="Operation record">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-xs text-ink/50">Procedure</dt>
                <dd className="font-medium">{operation.procedureName}</dd>
                <dt className="text-xs text-ink/50">Pre-op diagnosis</dt>
                <dd>{operation.preOpDiagnosis}</dd>
                <dt className="text-xs text-ink/50">Post-op diagnosis</dt>
                <dd>{operation.postOpDiagnosis}</dd>
                <dt className="text-xs text-ink/50">Anesthesia</dt>
                <dd>{operation.anesthesiaType} — {operation.anesthetist}</dd>
                <dt className="text-xs text-ink/50">EBL</dt>
                <dd>{operation.estimatedBloodLoss}</dd>
                <dt className="text-xs text-ink/50">Findings</dt>
                <dd>{operation.findings}</dd>
                <dt className="text-xs text-ink/50">Procedure details</dt>
                <dd className="sm:col-span-1">{operation.procedureDetails}</dd>
                <dt className="text-xs text-ink/50">Complications</dt>
                <dd>{operation.complications || "None"}</dd>
                <dt className="text-xs text-ink/50">Specimens</dt>
                <dd>{operation.specimensSent.join(", ") || "None"}</dd>
                <dt className="text-xs text-ink/50">Post-op plan</dt>
                <dd className="sm:col-span-1">{operation.postOpPlan}</dd>
              </dl>
            </Card>
          )}

          {/* Discharge */}
          {discharge && (
            <Card title="Discharge summary">
              <p className="text-sm text-ink/70">{discharge.summary}</p>
              <p className="text-xs text-ink/50 mt-2">
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
