import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, File, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

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
    const { data: documents } = trpc.documents.getByClientId.useQuery(
        { clientId },
        { enabled: !!clientId }
    );
    const utils = trpc.useUtils();

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        // Validar tamaño
        if (file.size > MAX_FILE_SIZE_BYTES) {
            return {
                valid: false,
                error: `El archivo "${file.name}" excede el límite de ${MAX_FILE_SIZE_MB}MB (tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB)`
            };
        }

        // Validar tipo MIME
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return {
                valid: false,
                error: `El tipo de archivo "${file.type}" no está permitido para "${file.name}"`
            };
        }

        // Validar extensión
        const extension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            return {
                valid: false,
                error: `La extensión "${extension}" no está permitida para "${file.name}"`
            };
        }

        return { valid: true };
    };

    const handleFileUpload = async (files: FileList) => {
        if (!files || files.length === 0) return;

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

            toast.info(`Subiendo ${validFiles.length} archivo(s)...`);

            const response = await fetch('/api/upload/documents', {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al subir archivos');
            }

            const result = await response.json();

            toast.success(result.message || `${validFiles.length} archivo(s) subido(s) correctamente`);

            utils.documents.getByClientId.invalidate({ clientId });

        } catch (error) {
            console.error('Error uploading files:', error);
            toast.error(error instanceof Error ? error.message : 'Error al subir archivos. Por favor intenta de nuevo.');
        }
    };

    const handleDeleteDocument = async (documentId: number, documentName: string) => {
        // Usar window.confirm simple en lugar de AlertDialog
        if (!window.confirm(`¿Estás seguro de que deseas eliminar "${documentName}"? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            toast.info('Eliminando documento...');

            const response = await fetch(`/api/upload/documents/${documentId}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar documento');
            }

            toast.success('Documento eliminado correctamente');

            utils.documents.getByClientId.invalidate({ clientId });

        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error(error instanceof Error ? error.message : 'Error al eliminar documento');
        }
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
            POLIZA: { label: "Póliza", variant: "default" },
            CONTRATO: { label: "Contrato", variant: "secondary" },
            FOTO: { label: "Foto", variant: "outline" },
            ESTIMADO: { label: "Estimado", variant: "default" },
            FACTURA: { label: "Factura", variant: "secondary" },
            PERMISO: { label: "Permiso", variant: "outline" },
            OTRO: { label: "Otro", variant: "outline" },
        };

        const typeInfo = types[type] || types.OTRO;
        return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span>Documentos</span>
                    <Button
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Documentos
                    </Button>
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
                        No hay documentos subidos para este cliente
                    </p>
                ) : (
                    <div className="space-y-2">
                        {documents.map((doc: any) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    {getDocumentIcon(doc.mimeType)}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{doc.fileName}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(2)} KB` : 'Tamaño desconocido'}
                                        </p>
                                    </div>
                                    {getDocumentTypeBadge(doc.documentType)}
                                </div>
                                <div className="flex items-center gap-2">
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
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
