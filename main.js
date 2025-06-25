let db, SQL;
const doelen = {
  kcal: 1600,
  vet: 59,
  verzadigd: 20,
  kh: 140,
  suiker: 50,
  vezel: 30,
  eiwit: 120
};
let pieCharts = {};
let editIndex = null;
let producten = [];
let dagboek = [];
let dagboekDate = new Date();
// Supabase setup
const SUPABASE_URL = 'https://ailacxfprfqddsutzsof.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbGFjeGZwcmZxZGRzdXR6c29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4NDg3NTMsImV4cCI6MjA2NjQyNDc1M30.E-P_23zXKON95wKh3AZvmgVDD4f4cBeKT76kJzBQbFk';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Init sql.js
window.initSqlJs({ locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}` }).then(SQLLib => {
  SQL = SQLLib;
  if(window.localStorage.getItem('sqlite_db')) {
    db = new SQL.Database(Uint8Array.from(atob(localStorage.getItem('sqlite_db')), c => c.charCodeAt(0)));
  } else {
    db = new SQL.Database();
    db.run(`CREATE TABLE IF NOT EXISTS producten (id INTEGER PRIMARY KEY AUTOINCREMENT, naam TEXT, kcal REAL, vet REAL, verzadigd REAL, kh REAL, suiker REAL, vezel REAL, eiwit REAL);
            CREATE TABLE IF NOT EXISTS dagboek (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id INTEGER, gram REAL, moment TEXT, tijd INTEGER);`);
  }
  loadData();
});

async function loadData() {
  // Producten ophalen
  let { data: productenData, error: productenError } = await supabase
    .from('producten')
    .select('*')
    .eq('user_id', USER_ID)
    .order('id', { ascending: true });
  producten = productenData || [];
  // Dagboek ophalen
  let { data: dagboekData, error: dagboekError } = await supabase
    .from('dagboek')
    .select('*')
    .eq('user_id', USER_ID)
    .order('tijd', { ascending: true });
  dagboek = dagboekData || [];
  renderProducten();
  renderEetSelect();
  updateDagboekDatum();
  renderOverzicht();
}

async function addProduct() {
  let naam = document.getElementById('productNaam').value;
  let kcal = parseFloat(document.getElementById('productKcal').value) || 0;
  let vet = parseFloat(document.getElementById('productVet').value) || 0;
  let verzadigd = parseFloat(document.getElementById('productVerzadigd').value) || 0;
  let kh = parseFloat(document.getElementById('productKh').value) || 0;
  let suiker = parseFloat(document.getElementById('productSuiker').value) || 0;
  let vezel = parseFloat(document.getElementById('productVezel').value) || 0;
  let eiwit = parseFloat(document.getElementById('productEiwit').value) || 0;
  if(editIndex !== null) {
    // Update product
    let product = producten[editIndex];
    await supabase.from('producten').update({ naam, kcal, vet, verzadigd, kh, suiker, vezel, eiwit }).eq('id', product.id).eq('user_id', USER_ID);
    editIndex = null;
  } else {
    // Nieuw product
    await supabase.from('producten').insert([{ naam, kcal, vet, verzadigd, kh, suiker, vezel, eiwit, user_id: USER_ID }]);
  }
  await loadData();
  document.getElementById('productNaam').value = '';
  document.getElementById('productKcal').value = '';
  document.getElementById('productVet').value = '';
  document.getElementById('productVerzadigd').value = '';
  document.getElementById('productKh').value = '';
  document.getElementById('productSuiker').value = '';
  document.getElementById('productVezel').value = '';
  document.getElementById('productEiwit').value = '';
}

function editProduct(i) {
  let p = producten[i];
  document.getElementById('productNaam').value = p.naam;
  document.getElementById('productKcal').value = p.kcal;
  document.getElementById('productVet').value = p.vet;
  document.getElementById('productVerzadigd').value = p.verzadigd;
  document.getElementById('productKh').value = p.kh;
  document.getElementById('productSuiker').value = p.suiker;
  document.getElementById('productVezel').value = p.vezel;
  document.getElementById('productEiwit').value = p.eiwit;
  editIndex = i;
}

async function deleteProduct(i) {
  let product = producten[i];
  await supabase.from('producten').delete().eq('id', product.id).eq('user_id', USER_ID);
  await loadData();
}

function openTab(idx) {
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', i===idx));
  document.querySelectorAll('.tab-content').forEach((tab,i) => tab.classList.toggle('active', i===idx));
  if(idx===0) renderProducten();
  if(idx===1) { renderEetSelect(); updateDagboekDatum(); renderOverzicht(); }
}

function renderProducten() {
  let table = `<div class='table-responsive'><table><thead><tr><th>Naam</th><th>Kcal</th><th>Vet</th><th>Verz. vet</th><th>Kh</th><th>Suiker</th><th>Vezel</th><th>Eiwit</th></tr></thead><tbody>`;
  table += producten.map((p,i) => `
    <tr>
      <td>${p.naam}</td>
      <td>${p.kcal}</td>
      <td>${p.vet}</td>
      <td>${p.verzadigd}</td>
      <td>${p.kh}</td>
      <td>${p.suiker}</td>
      <td>${p.vezel}</td>
      <td>${p.eiwit}</td>
    </tr>`).join('');
  table += '</tbody></table></div>';
  document.getElementById('productList').innerHTML = table;
}

function renderEetSelect() {
  let search = (document.getElementById('searchProduct')?.value || '').toLowerCase();
  let filtered = producten.filter(p => p.naam.toLowerCase().includes(search));
  let options = filtered.map((p, i) => `<option value='${i}'>${p.naam}</option>`).join('');
  document.getElementById('eetProduct').innerHTML = options;
}

function getDateKey(date) {
  return date.toISOString().slice(0,10);
}

function formatDateFancy(date) {
  const dagen = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];
  const maanden = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  return `${dagen[date.getDay()]} ${date.getDate()} ${maanden[date.getMonth()]} ${date.getFullYear()}`;
}

function updateDagboekDatum() {
  document.getElementById('dagboekDatum').textContent = formatDateFancy(dagboekDate);
  renderDagboek();
  renderOverzicht();
}

function changeDagboekDag(delta) {
  dagboekDate.setDate(dagboekDate.getDate() + delta);
  updateDagboekDatum();
}

async function logEten() {
  let productIndex = document.getElementById('eetProduct').value;
  let gram = parseFloat(document.getElementById('eetGram').value) || 0;
  let moment = document.getElementById('eetMoment').value;
  let p = producten[productIndex];
  if(!p || !gram) return;
  let dateKey = getDateKey(dagboekDate);
  await supabase.from('dagboek').insert([{ product_id: p.id, gram, moment, tijd: Date.now(), datum: dateKey, user_id: USER_ID }]);
  await loadData();
  document.getElementById('eetGram').value = '';
}

function renderDagboek() {
  // Filter dagboek op geselecteerde dag
  let dateKey = getDateKey(dagboekDate);
  let dagboekFiltered = dagboek.filter(e => (e.datum || getDateKey(new Date(e.tijd))) === dateKey);
  if(dagboekFiltered.length === 0) {
    document.getElementById('dagboekList').innerHTML = '<em>Geen producten gegeten.</em>';
    return;
  }
  let isMobile = window.innerWidth <= 700;
  // Groepeer per moment
  let momenten = {};
  dagboekFiltered.forEach(e => {
    if(!momenten[e.moment]) momenten[e.moment] = [];
    momenten[e.moment].push(e);
  });
  let html = '';
  Object.keys(momenten).forEach(moment => {
    let entries = momenten[moment];
    // Som per moment
    let totaal = { kcal:0, vet:0, verzadigd:0, kh:0, suiker:0, vezel:0, eiwit:0 };
    html += `<div class='moment-block' style='background:#161616;'>
      <div class='moment-title'>${moment}</div>`;
    if(!isMobile) {
      html += `<table><thead><tr><th>Product</th><th>Gram</th><th>Kcal</th><th>Vet</th><th>Verz. vet</th><th>Kh</th><th>Suiker</th><th>Vezel</th><th>Eiwit</th></tr></thead><tbody>`;
    }
    entries.forEach(e => {
      let p = producten.find(x => x.id === e.product_id) || {};
      let g = e.gram/100;
      totaal.kcal += (p.kcal||0) * g;
      totaal.vet += (p.vet||0) * g;
      totaal.verzadigd += (p.verzadigd||0) * g;
      totaal.kh += (p.kh||0) * g;
      totaal.suiker += (p.suiker||0) * g;
      totaal.vezel += (p.vezel||0) * g;
      totaal.eiwit += (p.eiwit||0) * g;
      if(!isMobile) {
        html += `<tr>
          <td>${p.naam||''}</td>
          <td>${e.gram}</td>
          <td>${((p.kcal||0)*g).toFixed(1)}</td>
          <td>${((p.vet||0)*g).toFixed(1)}</td>
          <td>${((p.verzadigd||0)*g).toFixed(1)}</td>
          <td>${((p.kh||0)*g).toFixed(1)}</td>
          <td>${((p.suiker||0)*g).toFixed(1)}</td>
          <td>${((p.vezel||0)*g).toFixed(1)}</td>
          <td>${((p.eiwit||0)*g).toFixed(1)}</td>
        </tr>`;
      } else {
        html += `<div style=\"border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.04);margin-bottom:10px;padding:10px 8px;background:#161616;\">\n              <div style=\"font-weight:bold;\">${p.naam||''}</div>\n              <div>Gram: <b>${e.gram}</b></div>\n              <div>Kcal: <b>${((p.kcal||0)*g).toFixed(1)}</b> | Vet: <b>${((p.vet||0)*g).toFixed(1)}</b> | Verz. vet: <b>${((p.verzadigd||0)*g).toFixed(1)}</b></div>\n              <div>Kh: <b>${((p.kh||0)*g).toFixed(1)}</b> | Suiker: <b>${((p.suiker||0)*g).toFixed(1)}</b> | Vezel: <b>${((p.vezel||0)*g).toFixed(1)}</b> | Eiwit: <b>${((p.eiwit||0)*g).toFixed(1)}</b></div>\n            </div>`;
      }
    });
    if(!isMobile) {
      html += `<tr style='font-weight:bold;background:#f0f0fa;'><td>Totaal</td><td></td><td>${totaal.kcal.toFixed(1)}</td><td>${totaal.vet.toFixed(1)}</td><td>${totaal.verzadigd.toFixed(1)}</td><td>${totaal.kh.toFixed(1)}</td><td>${totaal.suiker.toFixed(1)}</td><td>${totaal.vezel.toFixed(1)}</td><td>${totaal.eiwit.toFixed(1)}</td></tr>`;
      html += '</tbody></table>';
    } else {
      html += `<div style='font-weight:bold;background:#161616;border-radius:8px;padding:8px 8px 4px 8px;margin-bottom:8px;'>Totaal: Kcal <b>${totaal.kcal.toFixed(1)}</b> | Vet <b>${totaal.vet.toFixed(1)}</b> | Verz. vet <b>${totaal.verzadigd.toFixed(1)}</b> | Kh <b>${totaal.kh.toFixed(1)}</b> | Suiker <b>${totaal.suiker.toFixed(1)}</b> | Vezel <b>${totaal.vezel.toFixed(1)}</b> | Eiwit <b>${totaal.eiwit.toFixed(1)}</b></div>`;
    }
    html += '</div>';
  });
  document.getElementById('dagboekList').innerHTML = html;
}

function renderOverzicht() {
  let totaal = { kcal: 0, vet: 0, verzadigd: 0, kh: 0, suiker: 0, vezel: 0, eiwit: 0 };
  dagboek.forEach(e => {
    let p = producten.find(x => x.id === e.product_id) || {};
    let g = e.gram/100;
    totaal.kcal += (p.kcal||0) * g;
    totaal.vet += (p.vet||0) * g;
    totaal.verzadigd += (p.verzadigd||0) * g;
    totaal.kh += (p.kh||0) * g;
    totaal.suiker += (p.suiker||0) * g;
    totaal.vezel += (p.vezel||0) * g;
    totaal.eiwit += (p.eiwit||0) * g;
  });
  // Pie charts voor alle voedingswaarden
  let pieData = [
    { key: 'kcal', label: 'Kcal', color: '#5A4FCF' },
    { key: 'vet', label: 'Vet', color: '#f7b731' },
    { key: 'verzadigd', label: 'Verz. vet', color: '#eb3b5a' },
    { key: 'kh', label: 'Kh', color: '#20bf6b' },
    { key: 'suiker', label: 'Suiker', color: '#8854d0' },
    { key: 'vezel', label: 'Vezel', color: '#3867d6' },
    { key: 'eiwit', label: 'Eiwit', color: '#fd9644' }
  ];
  let pieChartsRow = '';
  pieData.forEach((d, i) => {
    let value = Math.min(totaal[d.key], doelen[d.key]);
    let rest = Math.max(doelen[d.key] - totaal[d.key], 0);
    let id = 'pie_' + d.key;
    pieChartsRow += `<div class='pie-chart-col' style='flex-direction:column;align-items:center;min-width:120px;margin-bottom:18px;'>
      <div style='position:relative;display:inline-block;'>
        <canvas id='${id}' width='100' height='100'></canvas>
        <span style='position:absolute;left:0;top:0;width:100px;height:100px;display:flex;align-items:center;justify-content:center;font-size:1em;font-weight:600;pointer-events:none;letter-spacing:-1px;color:var(--accent-glow);'>${value.toFixed(0)}/${doelen[d.key]}</span>
      </div>
      <span class='pie-label' style='margin-top:8px;font-size:1.08em;'>${d.label}</span>
    </div>`;
    setTimeout(() => {
      let ctx = document.getElementById(id).getContext('2d');
      if(pieCharts[d.key]) pieCharts[d.key].destroy();
      pieCharts[d.key] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Gegeten', 'Resterend'],
          datasets: [{
            data: [value, rest],
            backgroundColor: [d.color, '#e0e0e0'],
            borderWidth: 0
          }]
        },
        options: {
          cutout: '70%',
          plugins: { legend: { display: false } },
          tooltips: { enabled: false }
        }
      });
    }, 0);
  });
  document.getElementById('pieCharts').innerHTML = pieChartsRow;
  document.getElementById('overzichtData').innerHTML = '';
}

// Export/import
function exportDB() {
  const data = db.export();
  const blob = new Blob([data], {type: 'application/octet-stream'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'database.sqlite';
  a.click();
}

function importDB(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    db = new SQL.Database(new Uint8Array(ev.target.result));
    saveDB();
    loadData();
  };
  reader.readAsArrayBuffer(file);
}

// Herteken bij resize voor responsive
window.addEventListener('resize', () => {
  renderProducten();
  renderDagboek();
  renderOverzicht();
});

window.addEventListener('DOMContentLoaded', () => {
  const showIdBtn = document.getElementById('show-id-btn');
  if (showIdBtn) {
    showIdBtn.onclick = () => {
      navigator.clipboard.writeText(USER_ID);
      alert('Jouw ID is gekopieerd naar het klembord:\n' + USER_ID + '\nGebruik dit ID op een ander apparaat om je data te koppelen.');
    };
  }
  const useIdBtn = document.getElementById('use-id-btn');
  if (useIdBtn) {
    useIdBtn.onclick = () => {
      const newId = prompt('Plak hier je bestaande ID:');
      if (newId && newId.trim().length > 0) {
        localStorage.setItem('user_id', newId.trim());
        location.reload();
      }
    };
  }
  // Nieuwe knoppen in dagboek-tab
  const showIdBtn2 = document.getElementById('show-id-btn2');
  if (showIdBtn2) {
    showIdBtn2.onclick = () => {
      navigator.clipboard.writeText(USER_ID);
      alert('Jouw ID is gekopieerd naar het klembord:\n' + USER_ID + '\nGebruik dit ID op een ander apparaat om je data te koppelen.');
    };
  }
  const useIdBtn2 = document.getElementById('use-id-btn2');
  if (useIdBtn2) {
    useIdBtn2.onclick = () => {
      const newId = prompt('Plak hier je bestaande ID:');
      if (newId && newId.trim().length > 0) {
        localStorage.setItem('user_id', newId.trim());
        location.reload();
      }
    };
  }
});

function getOrCreateUserId() {
  let id = localStorage.getItem('user_id');
  if(!id) {
    id = 'user_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    localStorage.setItem('user_id', id);
  }
  return id;
}

var USER_ID = getOrCreateUserId();
