/**
 * Utility per l'integrazione con il portale sviluppatori di Verizon Connect Reveal.
 * Gestisce l'autenticazione OAuth con token a scadenza (20 minuti) ed estrae
 * i dati dei veicoli, gli odometri e i chilometri percorsi.
 * Include un motore di simulazione GPS/satellitare per la modalità demo.
 */

// Credenziali di esempio predefinite per la modalità simulatore
const DEFAULT_SIMULATOR_VEHICLES = [
  {
    id: "v-01",
    plate: "FL-098-HR",
    make_model: "Fiat Doblò 1.6 MultiJet",
    year: 2022,
    fuel_type: "Diesel",
    initial_odometer: 124500,
    current_odometer: 126800,
    fuel_card_code: "CARD-99123",
    assigned_employee_id: "demo-emp-1",
    api_vehicle_id: "RV-DOBLO-01",
    consumption_limit: 6.0,
    notes: "Veicolo commerciale per consegne tecniche"
  },
  {
    id: "v-02",
    plate: "AB-123-CD",
    make_model: "Ford Transit Custom 2.0 EcoBlue",
    year: 2023,
    fuel_type: "Diesel",
    initial_odometer: 89200,
    current_odometer: 91450,
    fuel_card_code: "CARD-99124",
    assigned_employee_id: "demo-emp-2",
    api_vehicle_id: "RV-TRANSIT-02",
    consumption_limit: 6.5,
    notes: "Utilizzato dal team commerciale per visite clienti"
  },
  {
    id: "v-03",
    plate: "XY-889-ZZ",
    make_model: "Peugeot Partner 1.2 PureTech",
    year: 2021,
    fuel_type: "Benzina",
    initial_odometer: 43100,
    current_odometer: 44950,
    fuel_card_code: "CARD-99125",
    assigned_employee_id: "demo-emp-5",
    api_vehicle_id: "RV-PARTNER-03",
    consumption_limit: 7.0,
    notes: "Veicolo di supporto tecnico Junior"
  },
  {
    id: "v-04",
    plate: "ZA-776-XX",
    make_model: "Iveco Daily 35C16",
    year: 2020,
    fuel_type: "Diesel",
    initial_odometer: 156000,
    current_odometer: 159100,
    fuel_card_code: "CARD-99126",
    assigned_employee_id: "demo-emp-3",
    api_vehicle_id: "RV-DAILY-04",
    consumption_limit: 9.5,
    notes: "Furgone pesante assegnato alle spedizioni"
  }
];

/**
 * Autentica l'utente e restituisce il token di sessione (Verizon Reveal Token API)
 */
export const authenticateVerizonConnect = async (username, password) => {
  try {
    // Se siamo offline o non abbiamo inserito le credenziali, usiamo il simulatore
    if (!username || !password || username.includes("demo")) {
      return {
        success: true,
        token: "SIMULATED-JWT-TOKEN-" + Math.random().toString(36).substring(2, 15),
        expiresIn: 1200, // 20 minuti
        isDemo: true
      };
    }

    // Verizon Connect richiede le credenziali cifrate in Base64 (Basic Auth per ottenere il token Bearer)
    const base64Credentials = btoa(`${username}:${password}`);

    const response = await fetch("https://api.reveal.verizonconnect.com/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${base64Credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    if (!response.ok) {
      throw new Error(`Errore autenticazione Verizon Connect Reveal: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      success: true,
      token: data.access_token,
      expiresIn: data.expires_in || 1200,
      isDemo: false
    };
  } catch (error) {
    console.error("Errore di connessione a Verizon Connect API:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Recupera la lista di tutti i veicoli attivi
 */
export const fetchRevealVehicles = async (config) => {
  const isSimulated = !config || !config.token || config.token.startsWith("SIMULATED-");

  if (isSimulated) {
    // Restituisce i veicoli mockati con odomentri attuali leggermente incrementati per simulare il moto GPS
    return new Promise((resolve) => {
      setTimeout(() => {
        const incremented = DEFAULT_SIMULATOR_VEHICLES.map(v => {
          // Incrementa casualmente l'odometro di qualche chilometro (simulazione real-time)
          const randomIncrement = Math.floor(Math.random() * 8) + 2; 
          return {
            ...v,
            current_odometer: v.current_odometer + randomIncrement
          };
        });
        resolve(incremented);
      }, 800);
    });
  }

  try {
    const response = await fetch("https://api.reveal.verizonconnect.com/v1/vehicles", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) throw new Error("Impossibile recuperare i veicoli da Verizon Reveal API");
    
    const data = await response.json();
    
    // Mappa le chiavi API nel nostro formato standard dell'app
    return data.items.map(item => ({
      id: item.Id || item.id,
      plate: item.LicensePlateNumber || item.plateNumber || "N/D",
      make_model: `${item.Make || ""} ${item.Model || ""}`.trim() || "Veicolo Sconosciuto",
      year: item.Year || new Date().getFullYear(),
      fuel_type: item.FuelType || "Diesel",
      initial_odometer: item.OdometerInital || 0,
      current_odometer: Math.round((item.OdometerMeters || 0) / 1000), // Converte metri in chilometri come da istruzioni
      api_vehicle_id: item.VehicleNumber || item.Id,
      consumption_limit: 6.5,
      notes: item.Notes || ""
    }));
  } catch (error) {
    console.error("Errore fetchRevealVehicles:", error);
    throw error;
  }
};

/**
 * Estrae lo storico dei chilometri percorsi in un intervallo di date
 * per calcolare esattamente i consumi.
 */
export const getKilometersTraveled = async (config, apiVehicleId, startDateStr, endDateStr) => {
  const isSimulated = !config || !config.token || config.token.startsWith("SIMULATED-");

  if (isSimulated) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Genera Km percorsi coerenti con lo storico programmato
        // Trova il veicolo nel simulatore
        const matched = DEFAULT_SIMULATOR_VEHICLES.find(v => v.api_vehicle_id === apiVehicleId || v.fuel_card_code === apiVehicleId);
        
        let km = 1500; // default
        if (matched) {
          if (matched.plate === "FL-098-HR") km = 1500; // Consumo normale
          if (matched.plate === "AB-123-CD") km = 1200; // Consumo anomalo (Laura Bianchi)
          if (matched.plate === "XY-889-ZZ") km = 1850; // Consumo Junior
          if (matched.plate === "ZA-776-XX") km = 3100; // Consumo pesante Daily
        } else {
          // Genera un chilometraggio casuale plausibile per il periodo
          const start = new Date(startDateStr);
          const end = new Date(endDateStr);
          const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 10;
          km = diffDays * (Math.floor(Math.random() * 80) + 40); // 40-120 km al giorno
        }

        resolve({
          vehicleId: apiVehicleId,
          startDate: startDateStr,
          endDate: endDateStr,
          kmTraveled: km,
          source: "SIMULATORE SAT-GPS (ECM)"
        });
      }, 600);
    });
  }

  try {
    // Interroga l'endpoint Trips di Verizon Connect Reveal per ottenere la distanza in metri in un range di date
    const response = await fetch(`https://api.reveal.verizonconnect.com/v1/vehicles/${apiVehicleId}/distance?start=${startDateStr}&end=${endDateStr}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${config.token}`,
        "Accept": "application/json"
      }
    });

    if (!response.ok) throw new Error("Impossibile recuperare lo storico dei chilometri satellitari");

    const data = await response.json();
    const distanceMeters = data.distanceMeters || data.DistanceMeters || 0;
    
    return {
      vehicleId: apiVehicleId,
      startDate: startDateStr,
      endDate: endDateStr,
      kmTraveled: Math.round(distanceMeters / 1000), // Converte metri a chilometri
      source: data.source || "Verizon Reveal ECM"
    };
  } catch (error) {
    console.error("Errore nel calcolo dei chilometri satellitari:", error);
    // Fallback automatico su simulatore per non bloccare mai l'operatività del cliente
    return {
      vehicleId: apiVehicleId,
      startDate: startDateStr,
      endDate: endDateStr,
      kmTraveled: 1000,
      source: "FALLBACK STIMATO (GPS)"
    };
  }
};
