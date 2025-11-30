"""
Script para eliminar el código duplicado de documentos en ClientProfile.tsx
y usar solo el componente DocumentsTab
"""

file_path = r"c:\Users\kanec\OneDrive\Escritorio\crm-public-adjusters\client\src\pages\ClientProfile.tsx"

# Leer el archivo
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Líneas a eliminar: 503-646 (inclusive, pero 0-indexed son 502-645)
# Y agregar import de DocumentsTab después de la línea 27
# Y la función handleFileUpload líneas 70-106 (0-indexed 69-105)

# Paso 1: Eliminar handleFileUpload (líneas 70-106, 0-indexed 69-105)
# Encontrar la línea que dice "const handleFileUpload" y eliminar hasta el cierre de función
new_lines = []
skip_until_line = -1
found_handle_file_upload = False

for i, line in enumerate(lines):
    # Agregar import de DocumentsTab después de DashboardLayout
    if i == 27 and 'import DashboardLayout' in line:
        new_lines.append(line)
        new_lines.append('import DocumentsTab from "@/components/DocumentsTab";\n')
        continue
    
    # Detectar inicio de handleFileUpload
    if 'const handleFileUpload' in line and not found_handle_file_upload:
        found_handle_file_upload = True
        skip_until_line = i
        # Buscar el cierre de esta función (línea que tiene solo '  };')
        for j in range(i, min(i + 50, len(lines))):
            if lines[j].strip() == '};' and j > i:
                skip_until_line = j
                break
        continue
    
    # Saltar líneas de handleFileUpload
    if found_handle_file_upload and i <= skip_until_line:
        continue
    
    new_lines.append(line)

# Paso 2: En las nuevas líneas, eliminar el bloque de documentos viejo (líneas ~485-)
# Buscar "  {/* Documents Tab */}" seguido de "<TabsContent value=\"documents\" className"
# Y eliminar hasta el "</TabsContent>" que le corresponde

final_lines = []
in_old_documents_tab = False
brace_count = 0
found_old_docs_tab = False

for i, line in enumerate(new_lines):
    # Detectar inicio del tab viejo de documentos
    if '{/* Documents Tab */}' in line and '<TabsContent value="documents"' in new_lines[i+1] if i+1 < len(new_lines) else False:
        # Verificar que no es nuestro nuevo tab (el nuevo no tiene className)
        if 'className="space-y-4"' in new_lines[i+1]:
            in_old_documents_tab = True
            found_old_docs_tab = True
            continue
    
    if in_old_documents_tab:
        # Contar tabs content closes  
        if '</TabsContent>' in line:
            in_old_documents_tab = False
            continue
        continue
    
    final_lines.append(line)

# Escribir el archivo
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print(f"✅ Archivo modificado exitosamente")
print(f"   - Import de DocumentsTab agregado")
print(f"   - handleFileUpload eliminado (duplicado)")
print(f"   - Tab viejo de documentos eliminado")
print(f"   - Ahora usa el componente DocumentsTab")
