import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, File, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface DocumentsTabProps {
    clientId: string;
}

export default function DocumentsTab({ clientId }: DocumentsTabProps) {
    const { data: documents } = trpc.documents.getByClientId.useQuery({ clientId });
    const utils = trpc.useUtils();

    const handleFileUpload = async (files: FileList) => {
        try {
            const formData = new FormData();

            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }

            formData.append('clientId', clientId);

            toast.info(`Subiendo ${files.length} archivo(s)...`);

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

            toast.success(result.message || 'Archivos subidos correctamente');

            utils.documents.getByClientId.invalidate({ clientId });

        } catch (error) {
            console.error('Error uploading files:', error);
            toast.error(error instanceof Error ? error.message : 'Error al subir archivos');
        }
    };

    const handleDeleteDocument = async (documentId: number) => {
        if (!confirm('¿Estás seguro de eliminar este documento? Esta acción no se puede deshacer.')) {
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

            const result = await response.json();
            toast.success(result.message || 'Documento eliminado correctamente');

            utils.documents.getByClientId.invalidate({ clientId });

        } catch (error) {
            console.error('Error deleting document:', error);
            toast.error(error instanceof Error ? error.message : 'Error al eliminar documento');
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
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                        <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                            className="hidden"
                            id="document-upload"
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    handleFileUpload(e.target.files);
                                    e.target.value = '';
                                }
                            }}
                        />
                        <label
                            htmlFor="document-upload"
                            className="cursor-pointer inline-flex flex-col items-center gap-2"
                        >
                            <Upload className="h-12 w-12 text-muted-foreground" />
                            <p className="text-sm font-medium">Click para seleccionar archivos</p>
                            <p className="text-xs text-muted-foreground">
                                PDF, Imágenes, Word, Excel (máx. 50MB)
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
                    {documents && documents.length > 0 ? (
                        <div className="space-y-3">
                            {documents.map((doc) => (
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
                                            onClick={() => handleDeleteDocument(doc.id)}
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
        </div>
    );
}
