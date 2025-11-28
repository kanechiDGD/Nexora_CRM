/**
 * Servicio de integración con Google Sheets
 * 
 * Para activar este servicio, necesitas:
 * 1. Crear un proyecto en Google Cloud Console
 * 2. Habilitar Google Sheets API
 * 3. Crear credenciales (OAuth2 o Service Account)
 * 4. Agregar las credenciales como variables de entorno:
 *    - GOOGLE_CLIENT_ID
 *    - GOOGLE_CLIENT_SECRET
 *    - GOOGLE_REFRESH_TOKEN
 *    O para Service Account:
 *    - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *    - GOOGLE_PRIVATE_KEY
 */

interface SheetRow {
  [key: string]: string | number | null;
}

export class GoogleSheetsService {
  private spreadsheetId: string;
  private isConfigured: boolean;

  constructor(spreadsheetId?: string) {
    this.spreadsheetId = spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || '';
    this.isConfigured = this.checkConfiguration();
  }

  private checkConfiguration(): boolean {
    // Verificar si las credenciales están configuradas
    const hasOAuth = !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN
    );
    
    const hasServiceAccount = !!(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    );

    return hasOAuth || hasServiceAccount;
  }

  /**
   * Leer datos de una hoja específica
   */
  async readSheet(sheetName: string, range?: string): Promise<SheetRow[]> {
    if (!this.isConfigured) {
      console.warn('[GoogleSheets] Service not configured. Returning empty data.');
      return [];
    }

    try {
      // TODO: Implementar llamada a Google Sheets API
      // const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!${range || 'A:Z'}`);
      // const data = await response.json();
      // return this.parseSheetData(data.values);
      
      console.log(`[GoogleSheets] Reading from sheet: ${sheetName}`);
      return [];
    } catch (error) {
      console.error('[GoogleSheets] Error reading sheet:', error);
      throw error;
    }
  }

  /**
   * Escribir datos a una hoja específica
   */
  async writeSheet(sheetName: string, data: SheetRow[], range?: string): Promise<void> {
    if (!this.isConfigured) {
      console.warn('[GoogleSheets] Service not configured. Skipping write operation.');
      return;
    }

    try {
      // TODO: Implementar llamada a Google Sheets API
      // const values = this.formatSheetData(data);
      // await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}!${range || 'A1'}:append`, {
      //   method: 'POST',
      //   body: JSON.stringify({ values }),
      // });
      
      console.log(`[GoogleSheets] Writing to sheet: ${sheetName}`, data.length, 'rows');
    } catch (error) {
      console.error('[GoogleSheets] Error writing sheet:', error);
      throw error;
    }
  }

  /**
   * Actualizar una fila específica
   */
  async updateRow(sheetName: string, rowIndex: number, data: SheetRow): Promise<void> {
    if (!this.isConfigured) {
      console.warn('[GoogleSheets] Service not configured. Skipping update operation.');
      return;
    }

    try {
      // TODO: Implementar actualización de fila
      console.log(`[GoogleSheets] Updating row ${rowIndex} in sheet: ${sheetName}`);
    } catch (error) {
      console.error('[GoogleSheets] Error updating row:', error);
      throw error;
    }
  }

  /**
   * Sincronizar cliente con hoja "Perfil"
   */
  async syncClientToProfile(client: any): Promise<void> {
    const profileData = {
      ID: client.id,
      'Nombre': `${client.firstName} ${client.lastName}`,
      'Email': client.email,
      'Teléfono': client.phone,
      'Dirección': client.propertyAddress,
      'Ciudad': client.city,
      'Estado': client.state,
      'Código Postal': client.zipCode,
      'Aseguradora': client.insuranceCompany,
      'Número de Póliza': client.policyNumber,
      'Número de Reclamo': client.claimNumber,
      'Estado del Reclamo': client.claimStatus,
      'Suplementado': client.suplementado,
      'Primer Cheque': client.primerCheque,
      'Vendedor': client.salesPerson,
    };

    await this.writeSheet('Perfil', [profileData]);
  }

  /**
   * Sincronizar log de actividad con hoja "log_log"
   */
  async syncActivityLog(log: any): Promise<void> {
    const logData = {
      ID: log.id,
      'ID Cliente': log.clientId,
      'Tipo': log.activityType,
      'Asunto': log.subject,
      'Descripción': log.description,
      'Resultado': log.outcome,
      'Fecha': log.performedAt,
      'Usuario': log.performedBy,
    };

    await this.writeSheet('log_log', [logData]);
  }

  /**
   * Sincronizar proyecto de construcción con hoja "Construction"
   */
  async syncConstructionProject(project: any): Promise<void> {
    const constructionData = {
      ID: project.id,
      'Nombre del Proyecto': project.projectName,
      'Dirección': project.propertyAddress,
      'Tipo de Techo': project.roofType,
      'Color de Techo': project.roofColor,
      'SQ Techo': project.roofSQ,
      'Tipo de Siding': project.sidingType,
      'Color de Siding': project.sidingColor,
      'SQ Siding': project.sidingSQ,
      'Número de Permiso': project.permitNumber,
      'Estado de Permiso': project.permitStatus,
      'Estado del Proyecto': project.projectStatus,
      'Contratista': project.contractor,
    };

    await this.writeSheet('Construction', [constructionData]);
  }

  private parseSheetData(values: any[][]): SheetRow[] {
    if (!values || values.length === 0) return [];
    
    const headers = values[0];
    const rows = values.slice(1);
    
    return rows.map(row => {
      const obj: SheetRow = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || null;
      });
      return obj;
    });
  }

  private formatSheetData(data: SheetRow[]): any[][] {
    if (data.length === 0) return [];
    
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(header => row[header] || ''));
    
    return [headers, ...rows];
  }
}

// Instancia singleton
export const googleSheetsService = new GoogleSheetsService();
