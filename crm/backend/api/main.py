"""
PropAI CRM — FastAPI Backend
Real estate CRM with leads, contacts, deals, tasks, and AI insights
"""
import os
import uuid
import json
import logging
from datetime import datetime, date
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PropAI CRM API",
    description="UK Real Estate CRM — Leads, Contacts, Deals, Tasks, AI Insights",
    version="1.0.0",
    docs_url="/crm/docs",
    redoc_url="/crm/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory store (replace with PostgreSQL in production) ─────────
_db = {
    "leads":    {},
    "contacts": {},
    "deals":    {},
    "tasks":    {},
    "activities": {},
    "notes":    {},
}

# ─────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────

class Lead(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: str = "Website"          # Website/Rightmove/Zoopla/Referral/Social/Walk-in
    status: str = "New"              # New/Contacted/Qualified/Unqualified/Converted
    budget_min: Optional[int] = None
    budget_max: Optional[int] = None
    preferred_county: Optional[str] = None
    preferred_property_type: Optional[str] = None
    min_bedrooms: Optional[int] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None
    score: int = 0                   # 0-100 lead score

class Contact(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    type: str = "Buyer"              # Buyer/Seller/Landlord/Tenant/Investor
    address: Optional[str] = None
    county: Optional[str] = None
    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    assigned_to: Optional[str] = None

class Deal(BaseModel):
    title: str
    contact_id: Optional[str] = None
    lead_id: Optional[str] = None
    stage: str = "Enquiry"           # Enquiry/Viewing/Offer/Negotiation/Under Offer/Exchanged/Completed/Fallen Through
    value: Optional[int] = None      # Property value £
    commission_rate: float = 1.5     # % commission
    property_address: Optional[str] = None
    property_type: Optional[str] = None
    bedrooms: Optional[int] = None
    county: Optional[str] = None
    expected_close: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None

class Task(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"         # Low/Medium/High/Urgent
    status: str = "Pending"          # Pending/In Progress/Done/Cancelled
    type: str = "Call"               # Call/Email/Viewing/Follow-up/Document/Meeting
    contact_id: Optional[str] = None
    deal_id: Optional[str] = None
    lead_id: Optional[str] = None
    assigned_to: Optional[str] = None

class Note(BaseModel):
    content: str
    entity_type: str                 # lead/contact/deal/task
    entity_id: str
    author: Optional[str] = "Agent"

# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────
def new_id(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def now_iso():
    return datetime.utcnow().isoformat() + "Z"

def store(table, item_id, data):
    _db[table][item_id] = {**data, "id": item_id, "updated_at": now_iso()}
    if "created_at" not in _db[table][item_id]:
        _db[table][item_id]["created_at"] = now_iso()
    return _db[table][item_id]

def get_or_404(table, item_id):
    obj = _db[table].get(item_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{table[:-1].capitalize()} {item_id} not found")
    return obj

def paginate(items, page=1, limit=20):
    start = (page - 1) * limit
    return items[start:start + limit]

# ─────────────────────────────────────────────────────────────
# SEED DATA
# ─────────────────────────────────────────────────────────────
def seed_demo_data():
    """Seed some demo data for development"""
    contacts_data = [
        {"first_name":"James","last_name":"Harrison","email":"j.harrison@email.co.uk","phone":"07700900001","type":"Buyer","county":"GREATER LONDON","tags":["VIP","First-time buyer"]},
        {"first_name":"Sarah","last_name":"Thompson","email":"s.thompson@gmail.com","phone":"07700900002","type":"Seller","county":"SURREY","tags":["Motivated seller"]},
        {"first_name":"David","last_name":"Patel","email":"d.patel@company.co.uk","phone":"07700900003","type":"Investor","county":"GREATER MANCHESTER","tags":["Portfolio investor","Buy-to-let"]},
        {"first_name":"Emma","last_name":"Wilson","email":"emma.wilson@email.com","phone":"07700900004","type":"Buyer","county":"KENT","tags":["Family mover"]},
    ]
    for c in contacts_data:
        cid = new_id("c_")
        store("contacts", cid, {**c, "assigned_to":"Agent 1","notes":"Demo contact"})

    leads_data = [
        {"name":"Michael Brown","email":"m.brown@email.co.uk","phone":"07700900010","source":"Rightmove","status":"Qualified","budget_min":350000,"budget_max":500000,"preferred_county":"GREATER LONDON","score":82},
        {"name":"Lucy Davies","email":"lucy.d@gmail.com","source":"Website","status":"New","budget_min":200000,"budget_max":280000,"preferred_county":"GREATER MANCHESTER","score":45},
        {"name":"Robert Kim","email":"r.kim@corp.co.uk","source":"Referral","status":"Contacted","budget_min":800000,"budget_max":1500000,"preferred_county":"SURREY","score":91},
        {"name":"Priya Sharma","email":"priya.s@email.com","source":"Zoopla","status":"New","budget_min":250000,"budget_max":350000,"preferred_county":"KENT","score":37},
    ]
    for l in leads_data:
        lid = new_id("l_")
        store("leads", lid, {**l, "assigned_to":"Agent 1"})

    # Deals
    deal_stages = [("Harrison Sale","Offer",485000,"GREATER LONDON"),("Patel Investment","Under Offer",320000,"GREATER MANCHESTER"),("Surrey Family Home","Viewing",650000,"SURREY"),("Manchester BTL","Enquiry",195000,"GREATER MANCHESTER")]
    for title, stage, val, county in deal_stages:
        did = new_id("d_")
        store("deals", did, {"title":title,"stage":stage,"value":val,"county":county,"commission_rate":1.5,"assigned_to":"Agent 1","property_type":"T"})

    # Tasks
    tasks_data = [
        {"title":"Call Michael Brown","type":"Call","priority":"High","status":"Pending","due_date":"2025-07-05"},
        {"title":"Schedule viewing for Lucy Davies","type":"Viewing","priority":"Medium","status":"Pending","due_date":"2025-07-06"},
        {"title":"Send mortgage info to Robert Kim","type":"Email","priority":"High","status":"In Progress","due_date":"2025-07-04"},
        {"title":"Follow up Priya Sharma enquiry","type":"Follow-up","priority":"Low","status":"Pending","due_date":"2025-07-08"},
    ]
    for t in tasks_data:
        tid = new_id("t_")
        store("tasks", tid, {**t,"assigned_to":"Agent 1"})

# Seed on startup
seed_demo_data()

# ─────────────────────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────────────────────

@app.get("/crm/health")
def health():
    return {"status":"healthy","service":"propai-crm","version":"1.0.0","timestamp":now_iso(),
            "stats":{"leads":len(_db["leads"]),"contacts":len(_db["contacts"]),"deals":len(_db["deals"]),"tasks":len(_db["tasks"])}}

@app.get("/crm/dashboard")
def dashboard():
    deals = list(_db["deals"].values())
    leads = list(_db["leads"].values())
    tasks = list(_db["tasks"].values())

    total_pipeline = sum(d.get("value",0)*(d.get("commission_rate",1.5)/100) for d in deals)
    stages = {}
    for d in deals:
        stages[d.get("stage","Unknown")] = stages.get(d.get("stage","Unknown"),0) + 1

    return {
        "kpis": {
            "total_leads": len(leads),
            "new_leads_today": sum(1 for l in leads if l.get("created_at","")[:10]==date.today().isoformat()),
            "total_contacts": len(_db["contacts"]),
            "total_deals": len(deals),
            "pipeline_value": sum(d.get("value",0) for d in deals),
            "pipeline_commission": round(total_pipeline),
            "completed_deals": sum(1 for d in deals if d.get("stage")=="Completed"),
            "overdue_tasks": sum(1 for t in tasks if t.get("status") not in ("Done","Cancelled") and t.get("due_date","9999") < date.today().isoformat()),
            "pending_tasks": sum(1 for t in tasks if t.get("status")=="Pending"),
        },
        "deal_stages": stages,
        "lead_sources": _count_by(leads, "source"),
        "lead_statuses": _count_by(leads, "status"),
        "recent_leads": sorted(leads, key=lambda x:x.get("created_at",""), reverse=True)[:5],
        "recent_deals": sorted(deals, key=lambda x:x.get("updated_at",""), reverse=True)[:5],
        "urgent_tasks": [t for t in tasks if t.get("priority")=="High" and t.get("status")!="Done"][:5],
    }

def _count_by(items, key):
    counts = {}
    for i in items:
        k = i.get(key,"Unknown")
        counts[k] = counts.get(k,0)+1
    return counts

# ── LEADS ──────────────────────────────────────────────────
@app.get("/crm/leads")
def list_leads(status:str=None, source:str=None, page:int=1, limit:int=20):
    items = list(_db["leads"].values())
    if status: items = [i for i in items if i.get("status")==status]
    if source: items = [i for i in items if i.get("source")==source]
    items.sort(key=lambda x: x.get("score",0), reverse=True)
    return {"total":len(items),"page":page,"items":paginate(items,page,limit)}

@app.post("/crm/leads", status_code=201)
def create_lead(lead: Lead):
    lid = new_id("l_")
    return store("leads", lid, lead.model_dump())

@app.get("/crm/leads/{lead_id}")
def get_lead(lead_id: str):
    return get_or_404("leads", lead_id)

@app.put("/crm/leads/{lead_id}")
def update_lead(lead_id: str, lead: Lead):
    get_or_404("leads", lead_id)
    return store("leads", lead_id, {**lead.model_dump(),"created_at":_db["leads"][lead_id].get("created_at","")})

@app.delete("/crm/leads/{lead_id}")
def delete_lead(lead_id: str):
    get_or_404("leads", lead_id)
    del _db["leads"][lead_id]
    return {"deleted": lead_id}

# ── CONTACTS ──────────────────────────────────────────────
@app.get("/crm/contacts")
def list_contacts(type:str=None, county:str=None, page:int=1, limit:int=20):
    items = list(_db["contacts"].values())
    if type: items = [i for i in items if i.get("type")==type]
    if county: items = [i for i in items if i.get("county")==county]
    items.sort(key=lambda x: x.get("created_at",""), reverse=True)
    return {"total":len(items),"page":page,"items":paginate(items,page,limit)}

@app.post("/crm/contacts", status_code=201)
def create_contact(contact: Contact):
    cid = new_id("c_")
    return store("contacts", cid, contact.model_dump())

@app.get("/crm/contacts/{contact_id}")
def get_contact(contact_id: str):
    return get_or_404("contacts", contact_id)

@app.put("/crm/contacts/{contact_id}")
def update_contact(contact_id: str, contact: Contact):
    get_or_404("contacts", contact_id)
    return store("contacts", contact_id, {**contact.model_dump(),"created_at":_db["contacts"][contact_id].get("created_at","")})

@app.delete("/crm/contacts/{contact_id}")
def delete_contact(contact_id: str):
    get_or_404("contacts", contact_id)
    del _db["contacts"][contact_id]
    return {"deleted": contact_id}

# ── DEALS ──────────────────────────────────────────────────
@app.get("/crm/deals")
def list_deals(stage:str=None, page:int=1, limit:int=20):
    items = list(_db["deals"].values())
    if stage: items = [i for i in items if i.get("stage")==stage]
    items.sort(key=lambda x: x.get("value",0) or 0, reverse=True)
    return {"total":len(items),"page":page,"items":paginate(items,page,limit)}

@app.post("/crm/deals", status_code=201)
def create_deal(deal: Deal):
    did = new_id("d_")
    return store("deals", did, deal.model_dump())

@app.get("/crm/deals/{deal_id}")
def get_deal(deal_id: str):
    return get_or_404("deals", deal_id)

@app.put("/crm/deals/{deal_id}")
def update_deal(deal_id: str, deal: Deal):
    get_or_404("deals", deal_id)
    return store("deals", deal_id, {**deal.model_dump(),"created_at":_db["deals"][deal_id].get("created_at","")})

@app.delete("/crm/deals/{deal_id}")
def delete_deal(deal_id: str):
    get_or_404("deals", deal_id)
    del _db["deals"][deal_id]
    return {"deleted": deal_id}

# ── TASKS ──────────────────────────────────────────────────
@app.get("/crm/tasks")
def list_tasks(status:str=None, priority:str=None, page:int=1, limit:int=20):
    items = list(_db["tasks"].values())
    if status: items = [i for i in items if i.get("status")==status]
    if priority: items = [i for i in items if i.get("priority")==priority]
    items.sort(key=lambda x: x.get("due_date","9999"))
    return {"total":len(items),"page":page,"items":paginate(items,page,limit)}

@app.post("/crm/tasks", status_code=201)
def create_task(task: Task):
    tid = new_id("t_")
    return store("tasks", tid, task.model_dump())

@app.put("/crm/tasks/{task_id}")
def update_task(task_id: str, task: Task):
    get_or_404("tasks", task_id)
    return store("tasks", task_id, {**task.model_dump(),"created_at":_db["tasks"][task_id].get("created_at","")})

@app.patch("/crm/tasks/{task_id}/complete")
def complete_task(task_id: str):
    t = get_or_404("tasks", task_id)
    t["status"] = "Done"
    t["completed_at"] = now_iso()
    return t

@app.delete("/crm/tasks/{task_id}")
def delete_task(task_id: str):
    get_or_404("tasks", task_id)
    del _db["tasks"][task_id]
    return {"deleted": task_id}

# ── NOTES ──────────────────────────────────────────────────
@app.post("/crm/notes", status_code=201)
def create_note(note: Note):
    nid = new_id("n_")
    return store("notes", nid, note.model_dump())

@app.get("/crm/notes/{entity_type}/{entity_id}")
def get_notes(entity_type: str, entity_id: str):
    notes = [n for n in _db["notes"].values() if n.get("entity_type")==entity_type and n.get("entity_id")==entity_id]
    notes.sort(key=lambda n: n.get("created_at",""), reverse=True)
    return {"items": notes}

# ── SEARCH ─────────────────────────────────────────────────
@app.get("/crm/search")
def search(q: str = Query(..., min_length=1)):
    q = q.lower()
    results = []
    for table in ("leads","contacts","deals"):
        for item in _db[table].values():
            text = json.dumps(item).lower()
            if q in text:
                results.append({**item, "_type": table[:-1]})
    return {"query": q, "results": results[:20]}

# ── AI INSIGHTS ────────────────────────────────────────────
@app.get("/crm/ai/lead-score/{lead_id}")
async def ai_lead_score(lead_id: str):
    """Use Gemini to score and analyse a lead"""
    lead = get_or_404("leads", lead_id)
    gemini_key = os.environ.get("GEMINI_API_KEY","")
    if not gemini_key:
        return {"score": lead.get("score",50), "reasoning": "Gemini API key not configured", "recommendations":["Set GEMINI_API_KEY in Render environment variables"]}

    import urllib.request
    prompt = f"""Analyse this UK property lead and provide a score 0-100 and recommendations.
Lead data: {json.dumps(lead, indent=2)}
Return ONLY JSON: {{"score": 75, "reasoning": "...", "recommendations": ["action 1", "action 2"], "priority": "High"}}"""

    try:
        body = json.dumps({"contents":[{"role":"user","parts":[{"text":prompt}]}],"generationConfig":{"temperature":0.3,"maxOutputTokens":500}}).encode()
        req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_key}",data=body,headers={"Content-Type":"application/json"},method="POST")
        with urllib.request.urlopen(req,timeout=10) as r:
            d = json.loads(r.read())
            text = d["candidates"][0]["content"]["parts"][0]["text"]
            clean = text.replace("```json","").replace("```","").strip()
            return json.loads(clean)
    except Exception as e:
        return {"score":lead.get("score",50),"reasoning":f"AI analysis unavailable: {e}","recommendations":["Follow up by phone","Check budget alignment"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)
