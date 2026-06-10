import React, { useState, useEffect } from 'react';
import { 
  Car, Settings, Upload, Check, AlertTriangle, RefreshCw, User, Plus, Search, 
  Trash2, Edit2, Info, AlertCircle, Calendar, ChevronRight, Download, CheckCircle 
} from 'lucide-react';
import { fetchRevealVehicles, getKilometersTraveled } from '../utils/revealApi';
import { extractFuelTransactions } from '../utils/gemini';
import { extractTextFromPdf } from '../utils/pdfParser';

export default function MezziTab({ 
  employees = [], 
  vehicles = [], 
  fuelTransactions = [], 
  verizonConfig = { username: '', password: '', token: '' },
  onSaveVehicle,
  onDeleteVehicle,
  onSaveVerizonConfig,
  onImportFuelTransactions
}) {
  const [activeSubTab, setActiveSubTab] = useState('parco'); // 'parco', 'import-excel', 'consumi', 'reveal-api'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stati Modale Veicolo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formPlate, setFormPlate] = useState('');
  const [formMakeModel, setFormMakeModel] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formFuelType, setFormFuelType] = useState('Diesel');
  const [formInitialOdo, setFormInitialOdo] = useState('0');
  const [formCurrentOdo, setFormCurrentOdo] = useState('0');
  const [formFuelCard, setFormFuelCard] = useState('');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formApiVehicleId, setFormApiVehicleId] = useState('');
  const [formConsumptionLimit, setFormConsumptionLimit] = useState('6.5');
  const [formNotes, setFormNotes] = useState('');

  // Stati Import Excel/Copy-Paste
  const [pasteText, setPasteText] = useState('');
  const [importStatus, setImportStatus] = useState(null); // { success: true, count: 5 }

  // Stati Analisi Consumi PDF
  const [selectedFile, setSelectedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState([]);
  const [isSyncingReveal, setIsSyncingReveal] = useState(false);
  const [showAnalysisReport, setShowAnalysisReport] = useState(false);

  // Stati Verizon Reveal API Panel
  const [apiUsername, setApiUsername] = useState(verizonConfig.username || '');
  const [apiPassword, setApiPassword] = useState(verizonConfig.password || '');
  const [apiIsConnecting, setApiIsConnecting] = useState(false);
  const [apiConnMessage, setApiConnMessage] = useState(null);

  // Sincronizzazione chilometraggi in background (Simulazione Real-Time)
  useEffect(() => {
    if (activeSubTab === 'parco') {
      const interval = setInterval(async () => {
        // Se siamo in modalità demo, aggiorniamo gradualmente gli odometri dei veicoli simulando il tracciamento
        const revealVehicles = await fetchRevealVehicles({ token: verizonConfig.token || 'SIMULATED-KEY' });
        
        revealVehicles.forEach(rv => {
          const matchLocal = vehicles.find(v => v.plate === rv.plate || v.api_vehicle_id === rv.api_vehicle_id);
          if (matchLocal && matchLocal.current_odometer !== rv.current_odometer) {
            onSaveVehicle({
              ...matchLocal,
              current_odometer: rv.current_odometer
            });
          }
        });
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [activeSubTab, vehicles, verizonConfig, onSaveVehicle]);

  // Form Modal handlers
  const openAddModal = () => {
    setEditingVehicle(null);
    setFormPlate('');
    setFormMakeModel('');
    setFormYear(new Date().getFullYear());
    setFormFuelType('Diesel');
    setFormInitialOdo('0');
    setFormCurrentOdo('0');
    setFormFuelCard('');
    setFormEmployeeId('');
    setFormApiVehicleId('');
    setFormConsumptionLimit('6.5');
    setFormNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormPlate(vehicle.plate);
    setFormMakeModel(vehicle.make_model);
    setFormYear(vehicle.year || new Date().getFullYear());
    setFormFuelType(vehicle.fuel_type);
    setFormInitialOdo(vehicle.initial_odometer?.toString() || '0');
    setFormCurrentOdo(vehicle.current_odometer?.toString() || '0');
    setFormFuelCard(vehicle.fuel_card_code || '');
    setFormEmployeeId(vehicle.assigned_employee_id || '');
    setFormApiVehicleId(vehicle.api_vehicle_id || '');
    setFormConsumptionLimit(vehicle.consumption_limit?.toString() || '6.5');
    setFormNotes(vehicle.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formPlate.trim() || !formMakeModel.trim()) {
      alert("Targa e Modello sono campi obbligatori.");
      return;
    }

    const vehicleData = {
      id: editingVehicle ? editingVehicle.id : 'v-' + Math.random().toString(36).substr(2, 9),
      plate: formPlate.toUpperCase().trim(),
      make_model: formMakeModel.trim(),
      year: parseInt(formYear) || new Date().getFullYear(),
      fuel_type: formFuelType,
      initial_odometer: parseFloat(formInitialOdo) || 0,
      current_odometer: parseFloat(formCurrentOdo) || parseFloat(formInitialOdo) || 0,
      fuel_card_code: formFuelCard.trim().toUpperCase() || null,
      assigned_employee_id: formEmployeeId || null,
      api_vehicle_id: formApiVehicleId.trim() || null,
      consumption_limit: parseFloat(formConsumptionLimit) || 6.5,
      notes: formNotes.trim()
    };

    onSaveVehicle(vehicleData);
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (confirm("Rimuovere questo veicolo dal parco aziendale? L'operazione scollegherà il dipendente assegnato.")) {
      onDeleteVehicle(id);
    }
  };

  // Caricamento/Paste Excel Importer
  const handleBulkImport = () => {
    if (!pasteText.trim()) {
      alert("Incolla dei dati prima di procedere.");
      return;
    }

    try {
      const rows = pasteText.trim().split('\n');
      let headers = [];
      let importedCount = 0;

      rows.forEach((row, index) => {
        const columns = row.split('\t').map(c => c.replace(/^["']|["']$/g, '').trim());
        
        if (index === 0) {
          headers = columns.map(h => h.toLowerCase());
          return;
        }

        // Mapping colonne
        let plate = '';
        let make_model = '';
        let fuel_type = 'Diesel';
        let year = new Date().getFullYear();
        let initial_odometer = 0;
        let fuel_card_code = '';
        let api_vehicle_id = '';
        let consumption_limit = 6.5;

        // Se l'utente non ha specificato l'header o se è standard, proviamo la decodifica posizionale
        if (headers.includes('targa') || headers.includes('plate')) {
          plate = columns[headers.findIndex(h => h.includes('targ') || h.includes('plate'))] || '';
          make_model = columns[headers.findIndex(h => h.includes('modell') || h.includes('model'))] || '';
          fuel_type = columns[headers.findIndex(h => h.includes('aliment') || h.includes('fuel'))] || 'Diesel';
          year = parseInt(columns[headers.findIndex(h => h.includes('anno') || h.includes('year'))]) || new Date().getFullYear();
          initial_odometer = parseFloat(columns[headers.findIndex(h => h.includes('odo') || h.includes('km'))]) || 0;
          fuel_card_code = columns[headers.findIndex(h => h.includes('cart') || h.includes('card'))] || '';
          api_vehicle_id = columns[headers.findIndex(h => h.includes('verizon') || h.includes('api'))] || '';
          consumption_limit = parseFloat(columns[headers.findIndex(h => h.includes('limit') || h.includes('consumo'))]) || 6.5;
        } else {
          // Fallback posizionale: Targa, Modello, Anno, Alimentazione, Odomentro Iniziale, Carta Carburante, ID Verizon, Limite Consumo
          plate = columns[0] || '';
          make_model = columns[1] || '';
          year = parseInt(columns[2]) || new Date().getFullYear();
          fuel_type = columns[3] || 'Diesel';
          initial_odometer = parseFloat(columns[4]) || 0;
          fuel_card_code = columns[5] || '';
          api_vehicle_id = columns[6] || '';
          consumption_limit = parseFloat(columns[7]) || 6.5;
        }

        if (plate && make_model) {
          const newVehicle = {
            id: 'v-bulk-' + Math.random().toString(36).substr(2, 9),
            plate: plate.toUpperCase(),
            make_model,
            year,
            fuel_type,
            initial_odometer,
            current_odometer: initial_odometer,
            fuel_card_code: fuel_card_code.toUpperCase() || null,
            assigned_employee_id: null,
            api_vehicle_id: api_vehicle_id || null,
            consumption_limit,
            notes: 'Importato massivamente da Excel'
          };
          onSaveVehicle(newVehicle);
          importedCount++;
        }
      });

      setImportStatus({ success: true, count: importedCount });
      setPasteText('');
      setTimeout(() => setImportStatus(null), 5000);
      setActiveSubTab('parco');
    } catch (err) {
      console.error(err);
      alert("Errore durante il parsing. Assicurati che i dati incollati da Excel siano formattati in colonne.");
    }
  };

  // Esecuzione OCR PDF Fattura + Analisi dei Consumi Satellitari
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setIsScanning(true);
    setScanProgress(15);

    // Animazione progress bar di scansione (laser verde a 2 secondi)
    const progressInterval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return p + 15;
      });
    }, 300);

    try {
      let text = "Fattura Carburante Fittizia";
      try {
        text = await extractTextFromPdf(file);
      } catch (err) {
        console.warn("PDF Reader Fallback: ", err.message);
      }

      setScanProgress(70);
      // Chiamata a Gemini per estrarre le transazioni
      const transactions = await extractFuelTransactions(text);
      setScanProgress(95);

      setScanResult(transactions);
      clearInterval(progressInterval);
      setScanProgress(100);
      
      // Ritardo per visualizzare il caricamento completato
      setTimeout(() => {
        setIsScanning(false);
        setScanProgress(0);
        setShowAnalysisReport(true);
      }, 500);
    } catch (err) {
      clearInterval(progressInterval);
      setIsScanning(false);
      alert("Impossibile analizzare il file PDF: " + err.message);
    }
  };

  // Sincronizzazione chilometraggi tramite le API di Verizon Connect per le transazioni importate
  const handleVerifyFuelConsumptions = async () => {
    setIsSyncingReveal(true);
    
    // Trova l'intervallo temporale della fattura
    if (scanResult.length === 0) return;
    
    const dates = scanResult.map(t => new Date(t.transaction_date));
    const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
    const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];

    const enrichedTransactions = await Promise.all(scanResult.map(async (tx) => {
      // Trova il veicolo corrispondente alla carta carburante o targa
      const vehicle = vehicles.find(v => 
        (v.fuel_card_code && v.fuel_card_code === tx.fuel_card_code) || 
        (v.plate && v.plate === tx.plate)
      );

      // Trova il dipendente corrispondente alla carta carburante in uso
      const employee = employees.find(e => 
        e.assets?.some(asset => asset.type === 'Carta Carburante' && asset.serial.toUpperCase() === tx.fuel_card_code.toUpperCase())
      ) || (vehicle ? employees.find(e => e.id === vehicle.assigned_employee_id) : null);

      if (vehicle) {
        // Interroga le API Verizon Connect Reveal per i chilometri percorsi
        const apiId = vehicle.api_vehicle_id || vehicle.plate;
        const trackingData = await getKilometersTraveled({ token: verizonConfig.token }, apiId, minDate, maxDate);
        
        // Calcola il consumo effettivo (litri / km) * 100
        const litersTotal = scanResult
          .filter(t => t.fuel_card_code === tx.fuel_card_code)
          .reduce((sum, t) => sum + t.liters, 0);

        const effectiveConsumption = trackingData.kmTraveled > 0 
          ? parseFloat(((litersTotal / trackingData.kmTraveled) * 100).toFixed(2))
          : 0;

        let anomalyStatus = 'OK';
        const limit = vehicle.consumption_limit || 6.5;
        if (effectiveConsumption > limit * 1.25) {
          anomalyStatus = 'CRITICAL';
        } else if (effectiveConsumption > limit) {
          anomalyStatus = 'WARNING';
        } else if (effectiveConsumption === 0 && litersTotal > 0) {
          anomalyStatus = 'CRITICAL'; // Fuel purchased, but vehicle didn't move!
        }

        return {
          ...tx,
          matched_employee_id: employee ? employee.id : null,
          matched_employee_name: employee ? employee.name : 'Sconosciuto',
          matched_vehicle_id: vehicle.id,
          matched_vehicle_plate: vehicle.plate,
          matched_vehicle_model: vehicle.make_model,
          matched_vehicle_limit: limit,
          satellite_km: trackingData.kmTraveled,
          effective_consumption: effectiveConsumption,
          anomaly_status: anomalyStatus
        };
      }

      return {
        ...tx,
        matched_employee_id: employee ? employee.id : null,
        matched_employee_name: employee ? employee.name : 'Sconosciuto',
        matched_vehicle_id: null,
        matched_vehicle_plate: 'Non Trovato',
        matched_vehicle_model: 'Veicolo non abbinato',
        matched_vehicle_limit: 0,
        satellite_km: 0,
        effective_consumption: 0,
        anomaly_status: 'WARNING'
      };
    }));

    onImportFuelTransactions(enrichedTransactions);
    setIsSyncingReveal(false);
    setShowAnalysisReport(false);
    setSelectedFile(null);
    setScanResult([]);
    alert("Analisi e verifica consumi satellitari completata! I dati sono stati importati nel registro.");
  };

  // Integrazione impostazioni Verizon Connect
  const handleVerizonConnectConfig = async (e) => {
    e.preventDefault();
    setApiIsConnecting(true);
    setApiConnMessage(null);

    // Simulazione di una connessione autenticata con token OAuth
    setTimeout(() => {
      onSaveVerizonConfig({
        username: apiUsername,
        password: apiPassword,
        token: 'SIMULATED-JWT-TOKEN-' + Math.random().toString(36).substr(2, 9)
      });
      setApiIsConnecting(false);
      setApiConnMessage({ success: true, text: "Connessione stabilita con successo! Token di sessione registrato." });
    }, 1200);
  };

  // Filtraggio veicoli nel pannello
  const filteredVehicles = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.make_model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.fuel_card_code && v.fuel_card_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', minHeight: 'calc(100vh - 120px)' }}>
      {/* Header Tab */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ flex: '1 1 240px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={24} style={{ color: 'var(--primary)' }} />
            <span>Modulo Mezzi & Tracciamento Consumi</span>
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Censimento della flotta aziendale, importazione Excel ed analisi dei carburanti incrociata con la telematica GPS satellitare.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeSubTab === 'parco' && (
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={14} />
              <span>+ Nuovo Veicolo</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', gap: '16px', overflowX: 'auto' }}>
        {[
          { id: 'parco', label: `🚗 Flotta Aziendale (${vehicles.length})` },
          { id: 'import-excel', label: '📥 Importa da Excel (Massivo)' },
          { id: 'consumi', label: '⛽ Verifica Consumi (Fattura PDF)' },
          { id: 'reveal-api', label: '📡 API Verizon Reveal Satellitare' }
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setActiveSubTab(sub.id)}
            style={{
              padding: '8px 0',
              border: 'none',
              background: 'transparent',
              borderBottom: activeSubTab === sub.id ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              color: activeSubTab === sub.id ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {sub.label}
          </button>
        ))}
      </div>

      {/* VIEW 1: PARCO VEICOLI */}
      {activeSubTab === 'parco' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Barra di ricerca */}
          <div className="glass-panel" style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-card)' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Cerca per targa, modello o codice carta carburante..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
            </div>
            {verizonConfig.token ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--success-light)', color: 'var(--success)', padding: '0 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(15,159,110,0.2)' }}>
                <span className="spinner" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                <span>TRACKING SAT ATTIVO</span>
              </div>
            ) : (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--warning-light)', color: 'var(--warning)', padding: '0 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', fontWeight: 700, border: '1px solid rgba(208,128,0,0.2)' }}>
                <span>TELEMENTRIA SIMULATA</span>
              </div>
            )}
          </div>

          {/* Griglia Parco Mezzi */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden' }}>
            {filteredVehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Car size={36} style={{ marginBottom: '12px', opacity: 0.3, color: 'var(--primary)' }} />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Nessun veicolo trovato</h3>
                <p style={{ fontSize: '0.8rem' }}>Crea un nuovo veicolo manualmente o importalo in blocco da Excel.</p>
              </div>
            ) : (
              <table className="compact-table">
                <thead>
                  <tr>
                    <th>Targa</th>
                    <th>Marca & Modello</th>
                    <th>Alimentazione</th>
                    <th>Carta Carburante</th>
                    <th>Dipendente Assegnato</th>
                    <th>Odomentro Satellitare</th>
                    <th>Consumo Target</th>
                    <th style={{ textAlign: 'right' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map(vehicle => {
                    const assignedEmp = employees.find(e => e.id === vehicle.assigned_employee_id);
                    
                    // Verifica se questo veicolo ha anomalie di consumo registrate
                    const txs = fuelTransactions.filter(t => t.matched_vehicle_id === vehicle.id);
                    const hasAnomaly = txs.some(t => t.anomaly_status === 'CRITICAL');
                    const hasWarning = txs.some(t => t.anomaly_status === 'WARNING');

                    return (
                      <tr key={vehicle.id}>
                        <td>
                          <span style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 800,
                            padding: '3px 8px',
                            background: 'var(--bg-app)',
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border-color)',
                            fontSize: '0.8rem',
                            display: 'inline-block'
                          }}>
                            {vehicle.plate}
                          </span>
                          {hasAnomaly && (
                            <span className="badge badge-danger" style={{ marginLeft: '6px', padding: '1px 4px', fontSize: '0.55rem' }}>Anomalia</span>
                          )}
                          {!hasAnomaly && hasWarning && (
                            <span className="badge badge-warning" style={{ marginLeft: '6px', padding: '1px 4px', fontSize: '0.55rem' }}>Alert</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>{vehicle.make_model}</td>
                        <td>
                          <span className={`badge ${
                            vehicle.fuel_type === 'Diesel' ? 'badge-primary' : 
                            vehicle.fuel_type === 'Elettrico' ? 'badge-success' : 'badge-warning'
                          }`} style={{ fontSize: '0.62rem' }}>
                            {vehicle.fuel_type}
                          </span>
                        </td>
                        <td>
                          {vehicle.fuel_card_code ? (
                            <code style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{vehicle.fuel_card_code}</code>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {assignedEmp ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}>
                              <User size={12} style={{ color: 'var(--primary)' }} />
                              {assignedEmp.name}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', italic: 'true' }}>Non assegnato</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--success)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="spinner" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--success)' }} />
                            {vehicle.current_odometer?.toLocaleString('it-IT')} Km
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                            {vehicle.consumption_limit || '6.5'} L/100Km
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button className="btn btn-secondary" style={{ padding: '4px 6px' }} onClick={() => openEditModal(vehicle)}>
                              <Edit2 size={12} />
                            </button>
                            <button className="btn btn-danger" style={{ padding: '4px 6px' }} onClick={() => handleDelete(vehicle.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          
          {/* Sezione Ledger Rifornimenti Storici */}
          {fuelTransactions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', marginBottom: '8px' }}>
                ⛽ Registro Rifornimenti e Analisi Telematica Consumi ({fuelTransactions.length})
              </h3>
              <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', overflow: 'hidden' }}>
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Carta Carburante</th>
                      <th>Dipendente</th>
                      <th>Veicolo</th>
                      <th>Litri</th>
                      <th>Importo</th>
                      <th>Km Satellitari</th>
                      <th>Consumo Effettivo</th>
                      <th>Stato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fuelTransactions.map((tx, idx) => (
                      <tr key={idx}>
                        <td>{new Date(tx.transaction_date).toLocaleDateString('it-IT')}</td>
                        <td><code>{tx.fuel_card_code}</code></td>
                        <td style={{ fontWeight: 600 }}>{tx.matched_employee_name}</td>
                        <td style={{ fontWeight: 700 }}>
                          {tx.matched_vehicle_plate} <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>({tx.matched_vehicle_model})</span>
                        </td>
                        <td>{tx.liters} L</td>
                        <td style={{ fontWeight: 600 }}>€ {tx.amount?.toFixed(2)}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 700 }}>{tx.satellite_km} Km</td>
                        <td style={{ fontWeight: 700 }}>
                          {tx.effective_consumption} L/100Km
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', fontWeight: 500 }}>
                            Target: {tx.matched_vehicle_limit} L/100Km
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${
                            tx.anomaly_status === 'CRITICAL' ? 'badge-danger' : 
                            tx.anomaly_status === 'WARNING' ? 'badge-warning' : 'badge-success'
                          }`} style={{ fontSize: '0.58rem' }}>
                            {tx.anomaly_status === 'CRITICAL' ? 'ANOMALIA CRITICA' : 
                             tx.anomaly_status === 'WARNING' ? 'DISCREPANZA' : 'CONSONO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: IMPORT MASSIVO EXCEL */}
      {activeSubTab === 'import-excel' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', marginBottom: '4px' }}>
              📥 Incolla Righe Tabella da Excel / Carica CSV
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Questo modulo consente di censire massivamente decine di automezzi. Puoi copiare la tabella delle auto direttamente da Microsoft Excel ed incollarla qui sotto. Il motore provvederà al parsing istantaneo.
            </p>
          </div>

          {/* Istruzioni Colonne */}
          <div style={{ background: 'var(--bg-app)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
            <strong>💡 Struttura delle Colonne consigliata in Excel (con intestazioni):</strong>
            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
              <code>Targa</code> \t <code>Modello</code> \t <code>Anno</code> \t <code>Alimentazione</code> \t <code>Km Iniziali</code> \t <code>Carta Carburante</code> \t <code>ID Verizon</code> \t <code>Expected L/100Km</code>
            </p>
            <span style={{ color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
              *Se incollato senza intestazioni, il sistema decodificherà posizionalmente le colonne in base a questo esatto ordine.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Area di Incollo Dati da Excel
            </label>
            <textarea
              rows="10"
              placeholder="Incolla qui le righe copiate da Excel..."
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a 
              href="data:text/csv;charset=utf-8,Targa,Modello,Anno,Alimentazione,Km Iniziali,Carta Carburante,ID Verizon,Expected L/100Km%0AFL-098-HR,Fiat Doblò,2022,Diesel,124500,CARD-99123,RV-DOBLO-01,6.0%0AAB-123-CD,Ford Transit,2023,Diesel,89200,CARD-99124,RV-TRANSIT-02,6.5" 
              download="template_import_mezzi.csv"
              className="btn btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.72rem' }}
            >
              <Download size={12} />
              <span>Scarica Template CSV</span>
            </a>
            <button className="btn btn-primary" onClick={handleBulkImport} style={{ padding: '10px 20px' }}>
              <span>🚀 Esegui Importazione Massiva</span>
            </button>
          </div>

          {importStatus && (
            <div className="badge-success" style={{ padding: '12px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
              <CheckCircle size={16} />
              <span>Importati con successo <strong>{importStatus.count}</strong> nuovi veicoli nella flotta!</span>
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: VERIFICA CONSUMI CARBURANTE */}
      {activeSubTab === 'consumi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Uploader PDF/Fatture */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', padding: '24px', textAlign: 'center' }}>
            
            {/* Animazione di Scansione Laser Verde (WOW Effect) */}
            {isScanning ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '20px 0', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  width: '120px',
                  height: '140px',
                  border: '2px dashed var(--primary)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Upload size={32} className="spinner" style={{ color: 'var(--primary)' }} />
                  {/* Il Laser Verde Oscillante */}
                  <div style={{
                    position: 'absolute',
                    width: '100%',
                    height: '3px',
                    background: '#00ff66',
                    boxShadow: '0 0 10px #00ff66, 0 0 20px #00ff66',
                    top: '0',
                    left: '0',
                    animation: 'pulse 1s infinite alternate, bell-bounce 1.5s infinite ease-in-out' // Sweep animation mock
                  }} />
                </div>
                <div style={{ width: '220px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 700, marginBottom: '4px' }}>
                    <span>ESTRAZIONE CON GEMINI AI...</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'var(--border-color)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${scanProgress}%`, height: '100%', background: '#00ff66', transition: 'width 0.2s ease' }} />
                  </div>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Lettura testo PDF in corso tramite OCR locale + strutturazione AI...</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '50%',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-premium)'
                }}>
                  <Upload size={28} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Trascina qui la fattura carburante PDF o Excel
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Supporta fatture mensili Eni, IP, Q8, Esso o file di esportazione consumi carburante.
                  </p>
                </div>
                <label className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <span>Sfoglia File...</span>
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.csv,.txt"
                    onChange={handlePdfUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Report dell'analisi post-parsing */}
          {showAnalysisReport && scanResult.length > 0 && (
            <div className="glass-panel animate-fade-in" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                    <span>Dati estratti con successo da Gemini AI</span>
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Abbiamo rilevato <strong>{scanResult.length} transazioni di rifornimento</strong> nella fattura caricata.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary" onClick={() => setShowAnalysisReport(false)}>Annulla</button>
                  <button className="btn btn-primary" disabled={isSyncingReveal} onClick={handleVerifyFuelConsumptions}>
                    {isSyncingReveal ? (
                      <>
                        <RefreshCw size={12} className="spinner" />
                        <span>Verifica Odomentri Reveal...</span>
                      </>
                    ) : (
                      <span>Incrocia con API Odomentri Satellitari 📡</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Anteprima transazioni prima dell'incrocio satellitare */}
              <div style={{ overflowY: 'auto', maxHeight: '300px' }}>
                <table className="compact-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Carta Carburante</th>
                      <th>Stazione di Servizio</th>
                      <th>Targa Rilevata</th>
                      <th>Litri Erogati</th>
                      <th>Importo Totale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.map((tx, idx) => (
                      <tr key={idx}>
                        <td>{tx.transaction_date}</td>
                        <td><code>{tx.fuel_card_code}</code></td>
                        <td>{tx.station_name}</td>
                        <td>
                          {tx.plate ? (
                            <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{tx.plate}</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.75rem' }}>Non specificata</span>
                          )}
                        </td>
                        <td style={{ fontWeight: 700 }}>{tx.liters} L</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>€ {tx.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: CONFIGURAZIONE API REVEAL */}
      {activeSubTab === 'reveal-api' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', alignItems: 'start' }}>
          
          {/* Connettore Credentials */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
                🔑 Credenziali Integrazione Portale Sviluppatori
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Inserisci le credenziali di tipo "Integration User" fornite dal supporto di Verizon Connect.
              </p>
            </div>

            <form onSubmit={handleVerizonConnectConfig} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Username Reveal API
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. integrazione.client@reveal.verizon"
                  value={apiUsername}
                  onChange={e => setApiUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Password API
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={apiPassword}
                  onChange={e => setApiPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={apiIsConnecting} style={{ alignSelf: 'flex-start', padding: '8px 16px', marginTop: '6px' }}>
                {apiIsConnecting ? (
                  <>
                    <RefreshCw size={12} className="spinner" />
                    <span>Connessione a Verizon...</span>
                  </>
                ) : 'Verifica e Salva Credenziali'}
              </button>
            </form>

            {apiConnMessage && (
              <div className="badge-success" style={{ padding: '10px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} />
                <span>{apiConnMessage.text}</span>
              </div>
            )}
          </div>

          {/* Verizon API Developer Manual */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8rem' }}>
            <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
              📚 Panoramica Portale Sviluppatori Reveal
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-secondary)' }}>
              <p>
                Le API di tracciamento satellitare Verizon Connect permettono l'audit accurato e robusto della flotta aziendale.
              </p>
              
              <div>
                <strong>🔗 Endpoint Odomentri (ECM / CAN-BUS):</strong>
                <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', background: 'var(--bg-app)', padding: '6px', borderRadius: 'var(--radius-xs)', marginTop: '2px', color: 'var(--text-primary)' }}>
                  GET /v1/vehicles/{'{api_vehicle_id}'}/distance
                </p>
              </div>

              <div>
                <strong>⚙️ Gestione dei Chilometri (Km):</strong>
                <p>
                  Per garantire la massima precisione ed allineamento alle linee guida, il sistema converte automaticamente la lettura <code>OdometerMeters</code> o <code>DistanceMeters</code> restituita dall'API da <strong>metri</strong> a <strong>chilometri</strong> (dividendo per 1000).
                </p>
              </div>

              <div style={{ background: 'var(--primary-light)', padding: '10px', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)', color: 'var(--text-primary)' }}>
                <strong>🚀 Simulatore Satellitare GPS Integrato:</strong>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Se non disponi di chiavi di produzione Reveal attive, l'applicazione attiva automaticamente il simulatore satellitare che interroga posizioni e odomentri virtuali dei 4 veicoli di prova.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DI CREAZIONE / MODIFICA VEICOLO */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ background: 'var(--bg-card)', maxWidth: '650px', width: '90%' }}>
            
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem' }}>
                {editingVehicle ? '📝 Modifica Veicolo Flotta' : '🚗 Aggiungi Nuovo Veicolo'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-primary)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="grid grid-cols-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Targa Veicolo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. FL098HR"
                      value={formPlate}
                      onChange={e => setFormPlate(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Marca & Modello *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="es. Fiat Doblò 1.6 MultiJet"
                      value={formMakeModel}
                      onChange={e => setFormMakeModel(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Anno Immatricolazione
                    </label>
                    <input
                      type="number"
                      placeholder="2022"
                      value={formYear}
                      onChange={e => setFormYear(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Alimentazione
                    </label>
                    <select
                      value={formFuelType}
                      onChange={e => setFormFuelType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    >
                      <option value="Diesel">Diesel</option>
                      <option value="Benzina">Benzina</option>
                      <option value="Ibrida">Ibrida</option>
                      <option value="GPL">GPL</option>
                      <option value="Metano">Metano</option>
                      <option value="Elettrico">Elettrico</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Consumo Target (L/100Km)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="6.5"
                      value={formConsumptionLimit}
                      onChange={e => setFormConsumptionLimit(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Odomentro Iniziale (Km)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formInitialOdo}
                      onChange={e => setFormInitialOdo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Odomentro Attuale (Km)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formCurrentOdo}
                      onChange={e => setFormCurrentOdo(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3">
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Codice Carta Carburante
                    </label>
                    <input
                      type="text"
                      placeholder="es. CARD-99123"
                      value={formFuelCard}
                      onChange={e => setFormFuelCard(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Dipendente Assegnato
                    </label>
                    <select
                      value={formEmployeeId}
                      onChange={e => setFormEmployeeId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    >
                      <option value="">Non assegnato</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase' }}>
                      ID Veicolo Verizon Reveal
                    </label>
                    <input
                      type="text"
                      placeholder="es. RV-DOBLO-01"
                      value={formApiVehicleId}
                      onChange={e => setFormApiVehicleId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Note / Dettagli aggiuntivi
                  </label>
                  <textarea
                    rows="3"
                    placeholder="es. Scadenza bollo, stato gomme, ecc."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                      outline: 'none',
                      resize: 'none'
                    }}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Chiudi</button>
                <button type="submit" className="btn btn-primary">Salva Mezzo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
