import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, File, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ClientDocument = {
    id: number;
    fileName: string;
    documentType: string;
    uploadedAt: string | Date;
    fileSize?: number | null;
    fileUrl: string;
};

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
    const { data: documents, isLoading: loadingDocuments } = trpc.documents.getByClientId.useQuery(
        { clientId },
        { enabled: !!clientId }
    );
    const utils = trpc.useUtils();
    const [isUploading, setIsUploading] = useState(false);
    const [documentToDelete, setDocumentToDelete] = useState<{ id: number; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

        setIsUploading(true);

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
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDocument = async () => {
        if (!documentToDelete) return;

        setIsDeleting(true);

        try {
            toast.info('Eliminando documento...');

            const response = await fetch(`/api/upload/documents/${documentToDelete.id}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Error al eliminar documento');
            }

            const result = await response.json();
            toast.success(result.message || 'Documento eliminado correctamente');

            utils.documents.getByClientId.invalidate({ clientId });

        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error(error instanceof Error ? error.message : 'Error al eliminar documento. Por favor intenta de nuevo.');
        } finally {
            setIsDeleting(false);
            setDocumentToDelete(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* Upload Section */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Subir Documentos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            <strong>Archivos permitidos:</strong> PDF, Imágenes (JPG, PNG, GIF, WebP), Word, Excel
                            <br />
                            <strong>Tamaño máximo:</strong> {MAX_FILE_SIZE_MB}MB por archivo
                        </AlertDescription>
                    </Alert>

                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <input
                            type="file"
                            multiple
                            accept={ALLOWED_EXTENSIONS.join(',')}
                            className="hidden"
                            id="document-upload"
                            disabled={isUploading}
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    handleFileUpload(e.target.files);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <label
                            htmlFor="document-upload"
                            className={`cursor-pointer inline-flex flex-col items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Upload className={`h-12 w-12 text-muted-foreground ${isUploading ? 'animate-pulse' : ''}`} />
                            <p className="text-sm font-medium">
                                {isUploading ? 'Subiendo archivos...' : 'Click para seleccionar archivos'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                PDF, Imágenes, Word, Excel (máx. {MAX_FILE_SIZE_MB}MB)
                            </p>
                        </label>
                    </div>
                </CardContent>
            </Card>

            {/* Documents List */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Documentos Subidos
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingDocuments ? (
                        <p className="text-center text-muted-foreground py-8">
                            Cargando documentos...
                        </p>
                    ) : documents && documents.length > 0 ? (
                        <div className="space-y-3">
                            {(documents as ClientDocument[]).map((doc) => (
                                <div
                                    key={doc.id}
                                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <File className="h-5 w-5 text-muted-foreground" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{doc.fileName}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <Badge variant="outline">{doc.documentType}</Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(doc.uploadedAt).toLocaleDateString('es-ES')}
                                                </span>
                                                {doc.fileSize && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {(doc.fileSize / 1024 / 1024).toFixed(2)} MB
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                <Download className="h-4 w-4 mr-2" />
                                                Descargar
                                            </a>
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => setDocumentToDelete({ id: doc.id, name: doc.fileName })}
                                            disabled={isDeleting}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Eliminar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">
                            No hay documentos subidos
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Diálogo de confirmación para eliminar */}
            <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. El documento "{documentToDelete?.name}" será eliminado permanentemente del sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteDocument}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
