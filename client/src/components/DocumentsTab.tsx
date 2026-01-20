import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, File, FileText, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface DocumentsTabProps {
    clientId: string;
}

// Constantes de validación
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx'];

export default function DocumentsTab({ clientId }: DocumentsTabProps) {
    const { t } = useTranslation();
    const [documentType, setDocumentType] = useState("");
    const [customDescription, setCustomDescription] = useState("");
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [editingDocId, setEditingDocId] = useState<number | null>(null);
    const [editType, setEditType] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const { data: documents } = trpc.documents.getByClientId.useQuery(
        { clientId },
        { enabled: !!clientId }
    );
    const utils = trpc.useUtils();
    const updateDocument = trpc.documents.update.useMutation({
        onSuccess: () => {
            toast.success(t('documents.updateSuccess'));
            utils.documents.getByClientId.invalidate({ clientId });
            setEditingDocId(null);
            setEditType("");
            setEditDescription("");
        },
        onError: (error) => {
            toast.error(error.message || t('documents.errors.updateFailed'));
        },
    });

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        // Validar tamaño
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return {
                valid: false,
                error: t('documents.errors.fileTooLarge', { fileName: file.name, maxMb: MAX_FILE_SIZE_MB, sizeMb: (file.size / 1024 / 1024).toFixed(2) })
            };
        }

        // Validar tipo MIME
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: t('documents.errors.invalidType', { fileName: file.name, fileType: file.type })
            };
        }

        // Validar extensión
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            return {
                valid: false,
                error: t('documents.errors.invalidExtension', { fileName: file.name, extension })
            };
        }

        return { valid: true };
    };

    const handleFileUpload = async (files: FileList) => {
        if (!files || files.length === 0) return;
        if (!documentType) {
            toast.error(t('documents.errors.typeRequired'));
            return;
        }

        // Validar todos los archivos antes de subir
        const validationErrors: string[] = [];
        const validFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const validation = validateFile(file);
            
            if (!validation.valid) {
                validationErrors.push(validation.error!);
            } else {
                validFiles.push(file);
            }
        }

        // Mostrar errores de validación
        if (validationErrors.length > 0) {
            validationErrors.forEach(error => toast.error(error));
            if (validFiles.length === 0) return;
        }

        try {
            const formData = new FormData();

            validFiles.forEach(file => {
                formData.append('files', file);
            });

            formData.append('clientId', clientId);
            formData.append('documentType', documentType);
            if (documentType === 'OTRO' && customDescription.trim()) {
                formData.append('description', customDescription.trim());
            }

            toast.info(t('documents.uploading', { count: validFiles.length }));

            const response = await fetch('/api/upload/documents', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || t('documents.errors.uploadFailed'));
            }

            const result = await response.json();

            toast.success(result.message || t('documents.uploadSuccess', { count: validFiles.length }));

            utils.documents.getByClientId.invalidate({ clientId });

        } catch (error) {
            console.error('Error uploading files:', error);
            toast.error(error instanceof Error ? error.message : t('documents.errors.uploadError'));
        }
    };

    const handleDeleteDocument = async (documentId: number, documentName: string) => {
        // Usar window.confirm simple en lugar de AlertDialog
        if (!window.confirm(t('documents.deleteConfirm', { name: documentName }))) {
            return;
        }

        try {
            toast.info(t('documents.deleting'));

            const response = await fetch(`/api/upload/documents/${documentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || t('documents.errors.deleteFailed'));
            }

            toast.success(t('documents.deleteSuccess'));

            utils.documents.getByClientId.invalidate({ clientId });

        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error(error instanceof Error ? error.message : t('documents.errors.deleteError'));
        }
    };

    const handleStartEdit = (doc: any) => {
        setEditingDocId(doc.id);
        setEditType(doc.documentType || "");
        setEditDescription(doc.documentType === "OTRO" ? doc.description || "" : "");
    };

    const handleSaveEdit = () => {
        if (!editingDocId) return;
        if (!editType) {
            toast.error(t('documents.errors.typeRequired'));
            return;
        }
        updateDocument.mutate({
            id: editingDocId,
            documentType: editType as any,
            description: editType === "OTRO" ? (editDescription.trim() || null) : null,
        });
    };

    const getDocumentIcon = (mimeType: string | null) => {
        if (!mimeType) return <File className="h-4 w-4" />;
        
        if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
        if (mimeType.includes('image')) return <File className="h-4 w-4" />;
        if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-4 w-4" />;
        if (mimeType.includes('excel') || mimeType.includes('sheet')) return <FileText className="h-4 w-4" />;
        
        return <File className="h-4 w-4" />;
    };

    const getDocumentTypeBadge = (type: string) => {
        const types: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
            POLIZA: { label: t('documents.types.policy'), variant: "default" },
            CONTRATO: { label: t('documents.types.contract'), variant: "secondary" },
            FOTO: { label: t('documents.types.photo'), variant: "outline" },
            ESTIMADO: { label: t('documents.types.estimate'), variant: "default" },
            ESTIMADO_ASEGURANZA: { label: t('documents.types.insuranceEstimate'), variant: "default" },
            ESTIMADO_NUESTRO: { label: t('documents.types.ourEstimate'), variant: "secondary" },
            MATERIAL_ORDER: { label: t('documents.types.materialOrder'), variant: "secondary" },
            CREW_REPORT: { label: t('documents.types.crewReport'), variant: "secondary" },
            FACTURA: { label: t('documents.types.invoice'), variant: "secondary" },
            PERMISO: { label: t('documents.types.permit'), variant: "outline" },
            OTRO: { label: t('documents.types.other'), variant: "outline" },
        };

        const typeInfo = types[type] || types.OTRO;
        return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>{t('documents.title')}</span>
                    <div className="flex flex-wrap items-center gap-2">
                        {showTypePicker && (
                            <>
                                <Select
                                    value={documentType}
                                    onValueChange={(value) => {
                                        setDocumentType(value);
                                        if (value !== "OTRO") {
                                            setCustomDescription("");
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[220px]">
                                        <SelectValue placeholder={t('documents.typeLabel')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="POLIZA">{t('documents.types.policy')}</SelectItem>
                                        <SelectItem value="ESTIMADO_ASEGURANZA">{t('documents.types.insuranceEstimate')}</SelectItem>
                                        <SelectItem value="ESTIMADO_NUESTRO">{t('documents.types.ourEstimate')}</SelectItem>
                                        <SelectItem value="MATERIAL_ORDER">{t('documents.types.materialOrder')}</SelectItem>
                                        <SelectItem value="CREW_REPORT">{t('documents.types.crewReport')}</SelectItem>
                                        <SelectItem value="CONTRATO">{t('documents.types.contract')}</SelectItem>
                                        <SelectItem value="FOTO">{t('documents.types.photo')}</SelectItem>
                                        <SelectItem value="FACTURA">{t('documents.types.invoice')}</SelectItem>
                                        <SelectItem value="PERMISO">{t('documents.types.permit')}</SelectItem>
                                        <SelectItem value="OTRO">{t('documents.types.other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                {documentType === "OTRO" && (
                                    <Input
                                        value={customDescription}
                                        onChange={(e) => setCustomDescription(e.target.value)}
                                        placeholder={t('documents.otherPlaceholder')}
                                        className="h-9 w-[220px]"
                                    />
                                )}
                            </>
                        )}
                        <Button
                            size="sm"
                            onClick={() => {
                                if (!showTypePicker) {
                                    setShowTypePicker(true);
                                    return;
                                }
                                if (!documentType) {
                                    toast.error(t('documents.errors.typeRequired'));
                                    return;
                                }
                                document.getElementById('file-upload')?.click();
                            }}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            {t('documents.uploadButton')}
                        </Button>
                    </div>
                </CardTitle>
                <input
                    id="file-upload"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) {
                            handleFileUpload(e.target.files);
                            e.target.value = '';
                        }
                    }}
                    accept={ALLOWED_EXTENSIONS.join(',')}
                />
            </CardHeader>
            <CardContent>
                {!documents || documents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                        {t('documents.noDocuments')}
                    </p>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc: any) => {
                            const isEditing = editingDocId === doc.id;
                            return (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    {getDocumentIcon(doc.mimeType)}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{doc.fileName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(2)} KB` : t('documents.unknownSize')}
                                        </p>
                                    </div>
                                    {isEditing ? (
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={editType}
                                                onValueChange={(value) => {
                                                    setEditType(value);
                                                    if (value !== "OTRO") {
                                                        setEditDescription("");
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="h-8 w-[200px]">
                                                    <SelectValue placeholder={t('documents.typeLabel')} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="POLIZA">{t('documents.types.policy')}</SelectItem>
                                                    <SelectItem value="ESTIMADO_ASEGURANZA">{t('documents.types.insuranceEstimate')}</SelectItem>
                                                    <SelectItem value="ESTIMADO_NUESTRO">{t('documents.types.ourEstimate')}</SelectItem>
                                                    <SelectItem value="MATERIAL_ORDER">{t('documents.types.materialOrder')}</SelectItem>
                                                    <SelectItem value="CREW_REPORT">{t('documents.types.crewReport')}</SelectItem>
                                                    <SelectItem value="CONTRATO">{t('documents.types.contract')}</SelectItem>
                                                    <SelectItem value="FOTO">{t('documents.types.photo')}</SelectItem>
                                                    <SelectItem value="FACTURA">{t('documents.types.invoice')}</SelectItem>
                                                    <SelectItem value="PERMISO">{t('documents.types.permit')}</SelectItem>
                                                    <SelectItem value="OTRO">{t('documents.types.other')}</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            {editType === "OTRO" && (
                                                <Input
                                                    value={editDescription}
                                                    onChange={(e) => setEditDescription(e.target.value)}
                                                    placeholder={t('documents.otherPlaceholder')}
                                                    className="h-8 w-[200px]"
                                                />
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {getDocumentTypeBadge(doc.documentType)}
                                            {doc.documentType === "OTRO" && doc.description ? (
                                                <span className="text-xs text-muted-foreground">
                                                    {doc.description}
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isEditing ? (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={handleSaveEdit}
                                                disabled={updateDocument.isLoading}
                                            >
                                                <Check className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setEditingDocId(null);
                                                    setEditType("");
                                                    setEditDescription("");
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStartEdit(doc)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => window.open(doc.fileUrl, '_blank')}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDeleteDocument(doc.id, doc.fileName)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
