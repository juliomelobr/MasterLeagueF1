#!/usr/bin/env python3
"""
Script para importar pilotos da planilha Google Sheets para Supabase
Uso: python3 import_pilotos.py
"""

import csv
import io
import requests
from datetime import datetime

# Configuration
SHEET_URL = "https://docs.google.com/spreadsheets/d/2PACX-1vRv5fWHGvYLOvVPdotHoOBiJrK8SOLshFEEhUUyPKfhy2iCt23JUMpjGy0Kg38MOF1Ti47mo2lYsi4x/export?format=csv&gid=1844400629"

# Supabase config (adicionar via environment variables em produção)
SUPABASE_URL = "https://seu-project.supabase.co"
SUPABASE_KEY = "sua-chave-api"

def fetch_sheet_data():
    """Busca dados da planilha Google Sheets"""
    try:
        response = requests.get(SHEET_URL)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"❌ Erro ao buscar planilha: {e}")
        return None

def parse_pilotos(csv_content):
    """Parse CSV e extrai pilotos
    Colunas esperadas:
    - C (2): Whatsapp
    - E (4): Grid
    - I (8) ou N (13): Email
    - P (15): Nome do Piloto
    """
    pilotos = []
    reader = csv.reader(io.StringIO(csv_content))
    
    for row_idx, row in enumerate(reader):
        if row_idx == 0:  # Skip header
            continue
        
        if len(row) < 16:  # Verificar se tem colunas suficientes
            continue
        
        # Extrair dados
        whatsapp = row[2].strip() if len(row) > 2 else ""
        grid_raw = row[4].strip() if len(row) > 4 else ""
        email = (row[13] or row[8] or "").strip() if len(row) > 13 else ""
        nome = row[15].strip() if len(row) > 15 else ""
        
        # Validações
        if not nome or not email:
            continue  # Pular se faltar nome ou email
        
        # Determinar grid
        grid = "light" if "light" in grid_raw.lower() else "carreira"
        
        piloto = {
            "nome": nome.upper(),
            "email": email.lower(),
            "grid": grid,
            "whatsapp": whatsapp,
            "is_steward": False
        }
        
        pilotos.append(piloto)
    
    return pilotos

def import_to_supabase(pilotos):
    """Importa pilotos para Supabase via API
    
    NOTA: Requer configuração de:
    1. SUPABASE_URL (sem barra no final)
    2. SUPABASE_KEY (chave de serviço com acesso POST)
    """
    
    if not pilotos:
        print("❌ Nenhum piloto para importar")
        return False
    
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/pilotos"
    
    print(f"\n📊 Importando {len(pilotos)} pilotos...")
    
    for idx, piloto in enumerate(pilotos, 1):
        try:
            response = requests.post(url, json=piloto, headers=headers)
            
            if response.status_code in [201, 204]:
                print(f"✅ {idx}/{len(pilotos)}: {piloto['nome']} ({piloto['email']})")
            elif response.status_code == 409:
                print(f"⚠️  {idx}/{len(pilotos)}: {piloto['nome']} já existe (ignorado)")
            else:
                print(f"❌ {idx}/{len(pilotos)}: {piloto['nome']} - Erro {response.status_code}")
                print(f"   Resposta: {response.text}")
        
        except requests.RequestException as e:
            print(f"❌ {idx}/{len(pilotos)}: {piloto['nome']} - {e}")
    
    print(f"\n✅ Importação concluída!")
    return True

def main():
    print("🚀 Importador de Pilotos - Master League F1")
    print("=" * 50)
    
    # Configurar Supabase
    print("\n⚙️  Configurando Supabase...")
    try:
        # Em produção, usar variáveis de ambiente:
        # import os
        # SUPABASE_URL = os.getenv("SUPABASE_URL")
        # SUPABASE_KEY = os.getenv("SUPABASE_KEY")
        
        if SUPABASE_URL == "https://seu-project.supabase.co":
            print("❌ Configure SUPABASE_URL no script!")
            return
        
        if SUPABASE_KEY == "sua-chave-api":
            print("❌ Configure SUPABASE_KEY no script!")
            return
    
    except Exception as e:
        print(f"❌ Erro ao configurar Supabase: {e}")
        return
    
    # Buscar planilha
    print("\n📥 Buscando dados da planilha...")
    csv_content = fetch_sheet_data()
    if not csv_content:
        return
    
    print("✅ Planilha baixada")
    
    # Parse CSV
    print("\n🔍 Processando pilotos...")
    pilotos = parse_pilotos(csv_content)
    
    if not pilotos:
        print("❌ Nenhum piloto encontrado na planilha!")
        return
    
    print(f"✅ {len(pilotos)} pilotos encontrados:")
    for p in pilotos[:5]:  # Mostrar primeiros 5
        print(f"   • {p['nome']} ({p['grid']}) - {p['email']}")
    if len(pilotos) > 5:
        print(f"   ... e mais {len(pilotos) - 5}")
    
    # Confirmar antes de importar
    response = input(f"\n❓ Importar {len(pilotos)} pilotos para Supabase? (s/n): ").lower()
    if response != "s":
        print("❌ Importação cancelada")
        return
    
    # Importar
    import_to_supabase(pilotos)

if __name__ == "__main__":
    main()
