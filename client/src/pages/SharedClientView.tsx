import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  FileText,
  Download,
  Calendar,
  DollarSign,
  ShieldAlert,
  Link,
} from "lucide-react";

export default function SharedClientView() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation();

  const { data, isLoading, error } = trpc.clientShares.getPublicData.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">{t("share.loading")}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-8">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">{t("share.notFound")}</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          {t("share.notFoundDescription")}
        </p>
      </div>
    );
  }

  const { client, documents } = data;

  const fmt = (val: string | null | undefined) => val || "—";
  const fmtDate = (val: string | Date | null | undefined) =>
    val
      ? new Date(val).toLocaleDateString(i18n.language, {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";
  const fmtCurrency = (val: number | null | undefined) =>
    val != null
      ? new Intl.NumberFormat(i18n.language, { style: "currency", currency: "USD" }).format(val)
      : "—";

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header bar */}
      <div className="bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              {client.firstName} {client.lastName}
            </span>
          </div>
          <Badge variant="secondary">{t("share.publicView")}</Badge>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* General Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {t("share.generalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("share.fields.name")}</p>
                  <p className="font-medium">{fmt(client.firstName)} {fmt(client.lastName)}</p>
                </div>
              </div>
              {client.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.phone")}</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.alternatePhone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.alternatePhone")}</p>
                    <p className="font-medium">{client.alternatePhone}</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.email")}</p>
                    <p className="font-medium">{client.email}</p>
                  </div>
                </div>
              )}
              {client.propertyAddress && (
                <div className="flex items-start gap-3 sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.address")}</p>
                    <p className="font-medium">
                      {client.propertyAddress}
                      {client.city ? `, ${client.city}` : ""}
                      {client.state ? `, ${client.state}` : ""}
                      {client.zipCode ? ` ${client.zipCode}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Claim Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              {t("share.claimInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {client.insuranceCompany && (
                <div className="flex items-start gap-3">
                  <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.insuranceCompany")}</p>
                    <p className="font-medium">{client.insuranceCompany}</p>
                  </div>
                </div>
              )}
              {client.policyNumber && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.policyNumber")}</p>
                    <p className="font-medium">{client.policyNumber}</p>
                  </div>
                </div>
              )}
              {client.claimNumber && (
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.claimNumber")}</p>
                    <p className="font-medium">{client.claimNumber}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">{t("share.fields.claimStatus")}</p>
                  <Badge variant="outline" className="mt-0.5">
                    {client.claimStatus
                      ? t(`dashboard.claimStatus.status.${client.claimStatus}`, { defaultValue: client.claimStatus })
                      : "—"}
                  </Badge>
                </div>
              </div>
              {client.dateOfLoss && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.dateOfLoss")}</p>
                    <p className="font-medium">{fmtDate(client.dateOfLoss)}</p>
                  </div>
                </div>
              )}
              {client.deductible != null && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.deductible")}</p>
                    <p className="font-medium">{fmtCurrency(client.deductible)}</p>
                  </div>
                </div>
              )}
              {client.coverageAmount != null && (
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t("share.fields.coverageAmount")}</p>
                    <p className="font-medium">{fmtCurrency(client.coverageAmount)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              {t("share.documents")} ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("share.noDocuments")}
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                        {doc.documentType}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                      >
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" download={doc.fileName}>
                          <Download className="h-4 w-4 mr-1" />
                          {t("share.download")}
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          {t("share.footer")}
        </p>
      </div>
    </div>
  );
}
