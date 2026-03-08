#!/bin/bash
# Script to create a complete test event with partidos, aves, and sorteo

API="https://api.genesispro.vip/api/v1"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJlYTkyMjc5YS04NmIxLTRjNTYtYWJjNi1hYTg3MTZkMGI4ZmUiLCJpYXQiOjE3NzI3NzUzMzAsImV4cCI6MTc3MzM4MDEzMH0.3EbqqA5lLaDUe6x2tfcmDWLttFNM586eqZNLm9AU96s"

call() {
  curl -s --max-time 15 -X "$1" "$API$2" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    ${3:+-d "$3"}
}

echo "=== CREATING EVENT ==="
EVENT_JSON=$(call POST "/eventos" '{
  "nombre": "Derby Fiestas de Marzo 2026",
  "fecha": "2026-03-15",
  "hora_inicio": "14:00",
  "lugar": "Palenque La Arena, Guadalajara, Jalisco",
  "tipo_derby": "derby",
  "formato_derby": "normal",
  "es_publico": true,
  "aves_por_partido": 3,
  "costo_inscripcion": 5000,
  "costo_por_pelea": 2000,
  "premio_campeon": 80000,
  "pesaje_abre": "10:00",
  "pesaje_cierra": "13:00",
  "hora_peleas": "15:00",
  "contacto_organizador": "315 555 1234",
  "reglas_navaja": "Navaja mexicana 1 pulgada, 1 linea. Derecha si excede 80g.",
  "reglas": "Derby a 3 aves por partido. Sorteo aleatorio por peso. Victoria=2pts, Tablas=1pt, Derrota=0pts. Comodin sin derecho a premio."
}')

echo "$EVENT_JSON"
EVENT_ID=$(echo "$EVENT_JSON" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
CODE=$(echo "$EVENT_JSON" | grep -o '"codigo_acceso":"[^"]*"' | cut -d'"' -f4)

if [ -z "$EVENT_ID" ]; then
  echo "ERROR: Failed to create event"
  exit 1
fi

echo ""
echo "Event ID: $EVENT_ID"
echo "Code: $CODE"
echo ""

echo "=== REGISTERING 6 PARTIDOS ==="

# Partido 1: Rancho El Caporal
P1=$(call POST "/derby/$EVENT_ID/partidos" '{"nombre": "Rancho El Caporal", "notas": "Juan Perez - Tomatlan, Jalisco"}')
P1_ID=$(echo "$P1" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "P1 ($P1_ID): Rancho El Caporal"

# Partido 2: Criadero Los Gallos de Oro
P2=$(call POST "/derby/$EVENT_ID/partidos" '{"nombre": "Gallos de Oro", "notas": "Roberto Sanchez - Autlan, Jalisco"}')
P2_ID=$(echo "$P2" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "P2 ($P2_ID): Gallos de Oro"

# Partido 3: Rancho La Esperanza
P3=$(call POST "/derby/$EVENT_ID/partidos" '{"nombre": "Rancho La Esperanza", "notas": "Miguel Torres - Colima"}')
P3_ID=$(echo "$P3" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "P3 ($P3_ID): Rancho La Esperanza"

# Partido 4: El Gavilan
P4=$(call POST "/derby/$EVENT_ID/partidos" '{"nombre": "El Gavilan", "notas": "Carlos Mendoza - Tepic, Nayarit"}')
P4_ID=$(echo "$P4" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "P4 ($P4_ID): El Gavilan"

# Partido 5: Criadero Dorado
P5=$(call POST "/derby/$EVENT_ID/partidos" '{"nombre": "Criadero Dorado", "notas": "Fernando Rios - Lagos de Moreno, Jalisco"}')
P5_ID=$(echo "$P5" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "P5 ($P5_ID): Criadero Dorado"

# Partido 6: Los Compadres
P6=$(call POST "/derby/$EVENT_ID/partidos" '{"nombre": "Los Compadres", "notas": "Eduardo Vega - Puerto Vallarta, Jalisco"}')
P6_ID=$(echo "$P6" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "P6 ($P6_ID): Los Compadres"

echo ""
echo "=== REGISTERING AVES (3 per partido = 18 total) ==="

# Partido 1: Rancho El Caporal
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P1_ID\", \"peso\": 2100, \"anillo\": \"CAP-01\", \"color\": \"Giro\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P1_ID\", \"peso\": 2250, \"anillo\": \"CAP-02\", \"color\": \"Colorado\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P1_ID\", \"peso\": 2050, \"anillo\": \"CAP-03\", \"color\": \"Cenizo\", \"placa\": \"\"}" > /dev/null
echo "P1 Caporal: CAP-01 (2100g), CAP-02 (2250g), CAP-03 (2050g)"

# Partido 2: Gallos de Oro
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P2_ID\", \"peso\": 2120, \"anillo\": \"ORO-01\", \"color\": \"Pinto\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P2_ID\", \"peso\": 2200, \"anillo\": \"ORO-02\", \"color\": \"Giro Oscuro\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P2_ID\", \"peso\": 2080, \"anillo\": \"ORO-03\", \"color\": \"Colorado Dorado\", \"placa\": \"\"}" > /dev/null
echo "P2 Oro: ORO-01 (2120g), ORO-02 (2200g), ORO-03 (2080g)"

# Partido 3: Rancho La Esperanza
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P3_ID\", \"peso\": 2150, \"anillo\": \"ESP-01\", \"color\": \"Negro\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P3_ID\", \"peso\": 2280, \"anillo\": \"ESP-02\", \"color\": \"Blanco\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P3_ID\", \"peso\": 2030, \"anillo\": \"ESP-03\", \"color\": \"Giro Claro\", \"placa\": \"\"}" > /dev/null
echo "P3 Esperanza: ESP-01 (2150g), ESP-02 (2280g), ESP-03 (2030g)"

# Partido 4: El Gavilan
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P4_ID\", \"peso\": 2130, \"anillo\": \"GAV-01\", \"color\": \"Cenizo Oscuro\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P4_ID\", \"peso\": 2220, \"anillo\": \"GAV-02\", \"color\": \"Colorado\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P4_ID\", \"peso\": 2060, \"anillo\": \"GAV-03\", \"color\": \"Pinto Oscuro\", \"placa\": \"\"}" > /dev/null
echo "P4 Gavilan: GAV-01 (2130g), GAV-02 (2220g), GAV-03 (2060g)"

# Partido 5: Criadero Dorado
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P5_ID\", \"peso\": 2090, \"anillo\": \"DOR-01\", \"color\": \"Giro Dorado\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P5_ID\", \"peso\": 2240, \"anillo\": \"DOR-02\", \"color\": \"Colorado Claro\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P5_ID\", \"peso\": 2040, \"anillo\": \"DOR-03\", \"color\": \"Negro Dorado\", \"placa\": \"\"}" > /dev/null
echo "P5 Dorado: DOR-01 (2090g), DOR-02 (2240g), DOR-03 (2040g)"

# Partido 6: Los Compadres
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P6_ID\", \"peso\": 2110, \"anillo\": \"COM-01\", \"color\": \"Pinto Claro\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P6_ID\", \"peso\": 2260, \"anillo\": \"COM-02\", \"color\": \"Giro Negro\", \"placa\": \"\"}" > /dev/null
call POST "/derby/$EVENT_ID/aves" "{\"partido_id\": \"$P6_ID\", \"peso\": 2070, \"anillo\": \"COM-03\", \"color\": \"Cenizo Claro\", \"placa\": \"\"}" > /dev/null
echo "P6 Compadres: COM-01 (2110g), COM-02 (2260g), COM-03 (2070g)"

echo ""
echo "=== EXECUTING SORTEO (Round 1) ==="
SORTEO=$(call POST "/derby/$EVENT_ID/sorteo" '{"margen_peso": 80}')
echo "$SORTEO" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    data = d.get('data', {})
    print(f\"Ronda: {data.get('ronda',{}).get('numero_ronda','?')}\")
    print(f\"Peleas generadas: {data.get('total_pareados', 0)}\")
    for p in data.get('peleas', []):
        r = p.get('rojo',{})
        v = p.get('verde',{})
        print(f\"  Pelea: {r.get('partido','?')} ({r.get('anillo','?')}, {r.get('peso','?')}g) vs {v.get('partido','?')} ({v.get('anillo','?')}, {v.get('peso','?')}g) diff={p.get('diff_peso','?')}g\")
    for s in data.get('sin_parear', []):
        print(f\"  SIN PAREJA: {s.get('partido','?')} ({s.get('anillo','?')}, {s.get('peso','?')}g)\")
    print(data.get('mensaje', ''))
except:
    print(sys.stdin.read() if hasattr(sys.stdin, 'read') else 'parse error')
" 2>/dev/null || echo "$SORTEO"

echo ""
echo "=== SUMMARY ==="
echo "Event: Derby Fiestas de Marzo 2026"
echo "Code: $CODE"
echo "Event ID: $EVENT_ID"
echo ""
echo "Partidos:"
echo "  #1 Rancho El Caporal (ID: $P1_ID)"
echo "  #2 Gallos de Oro (ID: $P2_ID)"
echo "  #3 Rancho La Esperanza (ID: $P3_ID)"
echo "  #4 El Gavilan (ID: $P4_ID)"
echo "  #5 Criadero Dorado (ID: $P5_ID)"
echo "  #6 Los Compadres (ID: $P6_ID)"
echo ""
echo "Use partido #6 (Los Compadres) for testing in the app"
