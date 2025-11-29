import { Router, type Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import * as db from "./db";
import { sdk } from "./_core/sdk";

// Configurar multer para usar memoria (no guardamos en disco, subimos directo a S3)  
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
    },
    fileFilter: (req, file, cb) => {
        // Permitir solo ciertos tipos de archivos
        const allowedMimeTypes = [
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

        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
        }
    },
});

const router = Router();

// Endpoint para subir documentos
router.post('/documents', upload.array('files', 10), async (req: Request, res: Response) => {
    try {
        // Autenticar usuario
        let user;
        try {
            user = await sdk.authenticateRequest(req);
        } catch (error) {
            return res.status(401).json({ error: 'No autenticado' });
        }

        // Verificar que el usuario pertenece a una organización
        const organizationMember = await db.getOrganizationMemberByUserId(user.id);
        if (!organizationMember) {
            return res.status(403).json({ error: 'Usuario no pertenece a ninguna organización' });
        }

        const files = req.files as Express.Multer.File[];
        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No se recibieron archivos' });
        }

        // Obtener metadata del body
        const { clientId, constructionProjectId, documentType, description } = req.body;

        console.log('[Upload] Received upload request - clientId:', clientId, 'files:', files.length);

        if (!clientId && !constructionProjectId) {
            return res.status(400).json({ error: 'Debe proporcionar clientId o constructionProjectId' });
        }

        // Si hay clientId, verificar que el cliente pertenece a la organización
        if (clientId) {
            const client = await db.getClientById(clientId, organizationMember.organizationId);
            if (!client) {
                return res.status(404).json({ error: 'Cliente no encontrado o no pertenece a su organización' });
            }
        }

        // Procesar y subir cada archivo
        const uploadedDocuments: Array<{
            fileName: string;
            fileUrl: string;
            documentType: string;
            fileSize: number;
            mimeType: string;
        }> = [];

        for (const file of files) {
            try {
                // Generar un nombre único para el archivo
                const timestamp = Date.now();
                const randomStr = Math.random().toString(36).substring(7);
                const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
                const storageKey = `documents/${organizationMember.organizationId}/${clientId || constructionProjectId}/${timestamp}-${randomStr}-${sanitizedFileName}`;

                console.log('[Upload] Uploading file to S3:', storageKey);

                // Subir archivo a S3
                const { url, key } = await storagePut(
                    storageKey,
                    file.buffer,
                    file.mimetype
                );

                console.log('[Upload] File uploaded successfully -  url:', url);

                // Determinar tipo de documento
                let docType: "POLIZA" | "CONTRATO" | "FOTO" | "ESTIMADO" | "FACTURA" | "PERMISO" | "OTRO" = "OTRO";

                if (documentType) {
                    docType = documentType as typeof docType;
                } else {
                    // Auto-detectar basado en el nombre del archivo
                    const lowerName = file.originalname.toLowerCase();
                    if (lowerName.includes('poliza') || lowerName.includes('policy')) {
                        docType = 'POLIZA';
                    } else if (lowerName.includes('contrato') || lowerName.includes('contract')) {
                        docType = 'CONTRATO';
                    } else if (lowerName.includes('foto') || lowerName.includes('photo') || lowerName.includes('image')) {
                        docType = 'FOTO';
                    } else if (lowerName.includes('estimado') || lowerName.includes('estimate')) {
                        docType = 'ESTIMADO';
                    } else if (lowerName.includes('factura') || lowerName.includes('invoice')) {
                        docType = 'FACTURA';
                    } else if (lowerName.includes('permiso') || lowerName.includes('permit')) {
                        docType = 'PERMISO';
                    }
                }

                // Guardar metadata en la base de datos
                console.log('[Upload] Saving document to database with clientId:', clientId, 'orgId:', organizationMember.organizationId);

                await db.createDocument({
                    clientId: clientId || null,
                    constructionProjectId: constructionProjectId ? parseInt(constructionProjectId) : null,
                    organizationId: organizationMember.organizationId,
                    documentType: docType,
                    fileName: file.originalname,
                    fileUrl: url,
                    fileKey: key,
                    mimeType: file.mimetype,
                    fileSize: file.size,
                    description: description || null,
                    tags: null,
                    driveFileId: null,
                    uploadedBy: user.id,
                });

                console.log('[Upload] Document saved to database successfully');

                uploadedDocuments.push({
                    fileName: file.originalname,
                    fileUrl: url,
                    documentType: docType,
                    fileSize: file.size,
                    mimeType: file.mimetype,
                });
            } catch (error) {
                console.error(`[Upload] Error uploading file ${file.originalname}:`, error);
                // Continuar con los siguientes archivos aunque uno falle
            }
        }

        if (uploadedDocuments.length === 0) {
            return res.status(500).json({ error: 'No se pudo subir ningún archivo' });
        }

        console.log('[Upload] All documents uploaded successfully. Total:', uploadedDocuments.length);

        return res.status(200).json({
            success: true,
            message: `${uploadedDocuments.length} archivo(s) subido(s) correctamente`,
            documents: uploadedDocuments,
        });

    } catch (error) {
        console.error('[Upload] Error:', error);
        return res.status(500).json({ error: 'Error al procesar la subida de archivos' });
    }
});

export { router as uploadRouter };
