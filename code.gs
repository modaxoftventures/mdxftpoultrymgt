/**
 * MODAXOFT POULTRY MANAGEMENT SYSTEM
 * v5.0 - Operational Google Sheets + Drive + Paystack backend
 *
 * IMPORTANT:
 * 1) Bind this Apps Script project to the database Google Sheet.
 * 2) Deploy as Web App -> Execute as ME -> Who has access: Anyone.
 * 3) Run setup() once.
 * 4) Run setPaystackConfig(publicKey, secretKey) from the Apps Script editor.
 *    NEVER put the Paystack secret key in frontend code.
 */

const TABLES = {
  Settings:['id','business_name','address','email','phone','currency','logo_url','theme_color','portal_name','portal_description','updated_at'],
  Farms:['id','farm_code','name','location','manager_user_id','active','created_at'],
  Users:['id','username','password_hash','name','role','farm_id','active','created_at'],
  Flocks:['id','batch','breed','date_placed','birds','status','notes','created_at'],
  Daily_Log:['id','flock_id','date','deaths','culls','feed_kg','eggs','notes','created_at'],
  Feed:['id','name','sku','quantity','unit','unit_cost','minimum_stock','stock_value','supplier','location','active','created_at'],
  Customers:['id','name','phone','email','location','created_at'],
  Products:['id','sku','name','category','unit','price','cost_price','quantity','minimum_stock','active','description','created_at'],
  Sales:['id','invoice','date','customer_id','product_id','quantity','unit_price','total','payment_status','status','payment_reference','created_by','created_at'],
  Expenses:['id','date','category','description','amount','payment_method','reference','created_by','created_at'],
  Employees:['id','employee_no','name','phone','department','job_title','basic_salary','status','created_at'],
  Attendance:['id','employee_id','date','status','notes','created_at'],
  Payroll:['id','period','employee_id','basic_salary','allowances','deductions','net_pay','status','payment_reference','created_by','created_at'],
  Notifications:['id','recipient_type','recipient_user_id','title','message','priority','status','created_at','read_at'],
  Service_Requests:['id','request_no','title','description','category','priority','status','requested_by','assigned_to','response','created_at','updated_at'],
  Chart_of_Accounts:['id','code','account_name','type','subtype','normal_balance','active','description','created_at'],
  Journal:['id','date','reference','account_code','description','debit','credit','source','source_id','created_by','created_at'],
  Audit_Log:['id','timestamp','user_id','username','action','table_name','record_id','status','message','details'],
  Shared_Files:['id','name','description','url','file_id','category','uploaded_by','active','created_at'],
  Management_Files:['id','name','description','url','file_id','category','uploaded_by','active','created_at'],
  Calendar:['id','title','description','type','start_at','end_at','all_day','priority','assigned_to','status','location','created_by','created_at','updated_at'],
  Tasks:['id','task_no','title','description','category','priority','due_date','assigned_to','status','progress','created_by','created_at','updated_at'],
  Payment_Transactions:['id','reference','invoice','sale_id','amount','currency','channel','status','paid_at','customer_email','raw','created_at']
};

const PERMS = {
  ADMIN:['*'],
  MANAGER:['Dashboard','Flocks','Daily_Log','Feed','Customers','Products','Sales','Expenses','Employees','Attendance','Payroll','Notifications','Service_Requests','Chart_of_Accounts','Journal','Shared_Files','Management_Files','Calendar','Tasks','Invoices','My_Activity'],
  ACCOUNTANT:['Dashboard','Customers','Products','Sales','Expenses','Payroll','Notifications','Service_Requests','Chart_of_Accounts','Journal','Ledger','Trial_Balance','Shared_Files','Calendar','Tasks','Invoices','My_Activity'],
  HR:['Dashboard','Employees','Attendance','Payroll','Notifications','Service_Requests','Shared_Files','Calendar','Tasks','My_Activity'],
  FARM_STAFF:['Dashboard','Flocks','Daily_Log','Feed','Products','Sales','Notifications','Service_Requests','Shared_Files','Calendar','Tasks','My_Activity']
};

const READ_ONLY = ['Audit_Log','Payment_Transactions'];
const ADMIN_DELETE_ONLY = ['Users','Flocks','Daily_Log','Feed','Customers','Products','Sales','Expenses','Employees','Attendance','Payroll','Notifications','Service_Requests','Chart_of_Accounts','Journal','Shared_Files','Management_Files','Calendar','Tasks','Payment_Transactions'];
const LINK = {
  Daily_Log:{flock_id:['Flocks','batch','breed']},
  Sales:{customer_id:['Customers','name','phone'],product_id:['Products','sku','name','category','price']},
  Attendance:{employee_id:['Employees','employee_no','name']},
  Payroll:{employee_id:['Employees','employee_no','name','basic_salary']},
  Service_Requests:{assigned_to:['Users','name','username']},
  Notifications:{recipient_user_id:['Users','name','username']},
  Calendar:{assigned_to:['Users','name','username']},
  Tasks:{assigned_to:['Users','name','username']},
  Users:{farm_id:['Farms','farm_code','name','location']},
  Farms:{manager_user_id:['Users','name','username']}
};

const DEFAULT_COA = [
 ['1000','Cash on Hand','ASSET','Current Asset','DEBIT'],
 ['1010','Bank Account','ASSET','Current Asset','DEBIT'],
 ['1020','Paystack Clearing','ASSET','Current Asset','DEBIT'],
 ['1100','Accounts Receivable','ASSET','Current Asset','DEBIT'],
 ['1200','Poultry Inventory','ASSET','Current Asset','DEBIT'],
 ['1300','Feed Inventory','ASSET','Current Asset','DEBIT'],
 ['1500','Farm Equipment','ASSET','Non-current Asset','DEBIT'],
 ['2000','Accounts Payable','LIABILITY','Current Liability','CREDIT'],
 ['2100','Accrued Expenses','LIABILITY','Current Liability','CREDIT'],
 ['3000','Owner Capital','EQUITY','Capital','CREDIT'],
 ['3100','Retained Earnings','EQUITY','Retained Earnings','CREDIT'],
 ['4000','Poultry Sales','INCOME','Sales Revenue','CREDIT'],
 ['4010','Egg Sales','INCOME','Sales Revenue','CREDIT'],
 ['4020','Manure Sales','INCOME','Other Income','CREDIT'],
 ['4030','Other Farm Income','INCOME','Other Income','CREDIT'],
 ['5000','Feed Expense','EXPENSE','Farm Operating','DEBIT'],
 ['5010','Veterinary Expense','EXPENSE','Farm Operating','DEBIT'],
 ['5020','Vaccination Expense','EXPENSE','Farm Operating','DEBIT'],
 ['5030','Transport & Delivery Expense','EXPENSE','Farm Operating','DEBIT'],
 ['5040','Farm Utilities','EXPENSE','Farm Operating','DEBIT'],
 ['5050','Wages & Salaries','EXPENSE','Payroll','DEBIT'],
 ['5060','Repairs & Maintenance','EXPENSE','Farm Operating','DEBIT'],
 ['5070','Other Farm Expenses','EXPENSE','General','DEBIT']
];

function doGet(e){return run((e&&e.parameter)||{});}
function doPost(e){
  try{
    const body=e&&e.postData&&e.postData.contents?e.postData.contents:'{}';
    return run(JSON.parse(body));
  }catch(err){return out(false,null,err&&err.message?err.message:String(err));}
}
function out(ok,data,error){return ContentService.createTextOutput(JSON.stringify({ok,data,error:error||null})).setMimeType(ContentService.MimeType.JSON);}

function run(p){
  try{
    p=p||{}; const action=String(p.action||'health');
    if(action==='health')return out(true,{status:'online',version:'5.1',timestamp:isoNow()});
    if(action==='adminStatus')return out(true,adminStatus());
    if(action==='setup')return out(true,setup());
    if(action==='createFirstAdmin')return out(true,firstAdmin(p.username,p.password,p.name));
    if(action==='login')return out(true,login(p.username,p.password));
    if(action==='publicSettings')return out(true,settings());
    if(action==='paystackWebhook')return out(true,handlePaystackWebhook(p.payload||p));
    if(action==='paystackConfig')return out(true,paystackPublicConfig());

    const user=session(p.token);
    if(action==='logout'){CacheService.getScriptCache().remove('s_'+p.token);audit(user,'LOGOUT','','','SUCCESS','User logged out','');return out(true,true);}
    if(action==='dashboard')return out(true,dashboard(user));
    if(action==='myProfile')return out(true,profile(user));
    if(action==='myActivity')return out(true,myActivity(user,p));
    if(action==='list'){read(user,p.table);return out(true,list(p.table));}
    if(action==='linkedOptions'){read(user,p.table);return out(true,linked(p.table,p.field));}
    if(action==='ledger'){read(user,'Journal');return out(true,ledger(p));}
    if(action==='trialBalance'){read(user,'Journal');return out(true,trialBalance(p));}
    if(action==='accountStatement'){read(user,'Journal');return out(true,accountStatement(p));}
    if(action==='myNotifications')return out(true,myNotes(user));
    if(action==='markNotificationRead'){markRead(user,p.id);return out(true,true);}
    if(action==='generateInvoice')return out(true,invoiceData(user,p.id));
    if(action==='nextInvoice')return out(true,{invoice:nextInvoice()});
    if(action==='filterInvoices'){read(user,'Sales');return out(true,filterInvoices(p));}
    if(action==='createPaymentReference'){read(user,'Sales');return out(true,createPaymentReference(user,p));}
    if(action==='verifyPayment'){read(user,'Sales');return out(true,verifyPayment(user,p.reference));}
    if(action==='syncPaystack')return out(true,syncPaystack(user,p));
    if(action==='folderLinks')return out(true,folderLinks(user));
    if(action==='savePaystackConfig'){
      if(user.role!=='ADMIN')throw new Error('Admin only');
      const cfg=savePaystackConfig(data(p.data)); audit(user,'PAYSTACK_CONFIG','Settings','PAYSTACK','SUCCESS','Paystack configuration updated','public key saved; secret key stored server-side'); return out(true,cfg);
    }
    if(action==='settings'){
      if(user.role!=='ADMIN')throw new Error('Admin only');
      const result=saveSettings(data(p.data));audit(user,'SETTINGS_UPDATE','Settings',result.id||'','SUCCESS','System settings updated',JSON.stringify(result));return out(true,result);
    }
    if(action==='create'){
      write(user,p.table);const result=create(p.table,data(p.data),user);return out(true,result);
    }
    if(action==='update'){
      write(user,p.table);const result=update(p.table,p.id,data(p.data),user);return out(true,result);
    }
    if(action==='delete'){
      if(user.role!=='ADMIN')throw new Error('Only Admin can delete records.');
      write(user,p.table);const result=del(p.table,p.id,user);return out(true,result);
    }
    if(action==='auditReport'){
      if(user.role!=='ADMIN')throw new Error('Admin only');
      return out(true,auditReport(p));
    }
    throw new Error('Unknown action: '+action);
  }catch(err){
    const msg=err&&err.message?err.message:String(err);
    return out(false,null,msg);
  }
}

function ss(){const book=SpreadsheetApp.getActiveSpreadsheet();if(!book)throw new Error('Bind this Apps Script project to the poultry management Google Sheet.');return book;}
function setup(){
  const book=ss();
  Object.keys(TABLES).forEach(function(t){
    let sheet=book.getSheetByName(t);if(!sheet)sheet=book.insertSheet(t);
    migrateHeaders(sheet,TABLES[t]);
    sheet.setFrozenRows(1);
  });
  if(!list('Settings').length){
    const row={id:Utilities.getUuid(),business_name:'Modaxoft Poultry',address:'Machakos, Kenya',email:'modaxoftholdingsplc@gmail.com',phone:'+2542062684475',currency:'KES',logo_url:'',theme_color:'#b91c1c',portal_name:'Farm Portal',portal_description:'Operational poultry management portal',updated_at:isoNow()};
    sh('Settings').appendRow(TABLES.Settings.map(k=>row[k]||''));
  }
  seedChartOfAccounts();
  seedFarms();
  ensureDriveFolders();
  return {message:'Database initialized successfully',sheets:Object.keys(TABLES)};
}
function migrateHeaders(sheet,headers){
  if(sheet.getLastRow()===0){sheet.getRange(1,1,1,headers.length).setValues([headers]);return;}
  const width=Math.max(sheet.getLastColumn(),1),old=sheet.getRange(1,1,1,width).getValues()[0].map(String);
  const same=old.length===headers.length&&headers.every((h,i)=>old[i]===h);
  if(same)return;
  const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,width).getValues():[];
  const mapped=rows.map(row=>headers.map(h=>{const i=old.indexOf(h);return i>=0?row[i]:'';}));
  sheet.clearContents();
  sheet.getRange(1,1,1,headers.length).setValues([headers]);
  if(mapped.length)sheet.getRange(2,1,mapped.length,headers.length).setValues(mapped);
}
function seedFarms(){
  if(list('Farms').length)return;
  const r={id:Utilities.getUuid(),farm_code:'MAIN',name:'Main Farm',location:'Machakos, Kenya',manager_user_id:'',active:'TRUE',created_at:isoNow()};
  sh('Farms').appendRow(TABLES.Farms.map(k=>r[k]||''));
}
function seedChartOfAccounts(){
  if(list('Chart_of_Accounts').length)return;
  const rows=DEFAULT_COA.map(a=>{
    const r={id:Utilities.getUuid(),code:a[0],account_name:a[1],type:a[2],subtype:a[3],normal_balance:a[4],active:'TRUE',description:'Default poultry accounting account',created_at:isoNow()};
    return TABLES.Chart_of_Accounts.map(k=>r[k]||'');
  });
  sh('Chart_of_Accounts').getRange(2,1,rows.length,TABLES.Chart_of_Accounts.length).setValues(rows);
}
function ensureDriveFolders(){
  const props=PropertiesService.getScriptProperties(), rootName='Modaxoft Poultry Shared';
  let rootId=props.getProperty('ROOT_FOLDER_ID'),root;
  try{root=rootId?DriveApp.getFolderById(rootId):null;}catch(e){root=null;}
  if(!root){root=DriveApp.createFolder(rootName);props.setProperty('ROOT_FOLDER_ID',root.getId());}
  try{root.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}
  ['Production & Resources','Management'].forEach(n=>{const it=root.getFoldersByName(n);const f=it.hasNext()?it.next():root.createFolder(n);try{f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(e){}});
  return root.getId();
}
function folderLinks(user){
  const root=DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID'));
  const prod=folderByName(root,'Production & Resources'),mgr=folderByName(root,'Management');
  const result={root:root.getUrl(),production:prod.getUrl()};
  if(user&&['ADMIN','MANAGER','ACCOUNTANT'].includes(String(user.role).toUpperCase()))result.management=mgr.getUrl();
  return result;
}
function folderByName(root,name){const it=root.getFoldersByName(name);return it.hasNext()?it.next():root.createFolder(name);}
function sh(t){if(!TABLES[t])throw new Error('Invalid table: '+t);const sheet=ss().getSheetByName(t);if(!sheet)throw new Error('Sheet '+t+' does not exist. Run setup() first.');return sheet;}
function data(x){if(typeof x==='string')return JSON.parse(x||'{}');return x||{};}
function n(x){if(x===null||x===undefined||x==='')return 0;const v=Number(x);return isFinite(v)?v:0;}
function hash(password){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(password||''),Utilities.Charset.UTF_8).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
function isoNow(){return new Date().toISOString();}
function list(t){
  const sheet=sh(t),values=sheet.getDataRange().getValues();if(values.length<2)return [];
  const headers=TABLES[t];
  return values.slice(1).filter(row=>row.some(x=>x!==''&&x!==null)).map(row=>{
    const o={};headers.forEach((h,i)=>{const v=row[i];o[h]=v instanceof Date?Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd'):v;});return o;
  });
}
function find(t,id){return list(t).find(x=>String(x.id)===String(id));}
function findBy(t,field,value){return list(t).find(x=>String(x[field])===String(value));}

function clean(t,input){
  const d=Object.assign({},input||{});
  if(t==='Users'){
    if(d.password){if(String(d.password).length<8)throw new Error('Password minimum is 8 characters.');d.password_hash=hash(d.password);delete d.password;}
    if(d.username)d.username=String(d.username).trim().toLowerCase();if(d.active===undefined)d.active='TRUE';
  }
  if(t==='Flocks')d.birds=Math.max(0,Math.floor(n(d.birds)));
  if(t==='Daily_Log'){d.deaths=Math.max(0,Math.floor(n(d.deaths)));d.culls=Math.max(0,Math.floor(n(d.culls)));d.feed_kg=Math.max(0,n(d.feed_kg));d.eggs=Math.max(0,Math.floor(n(d.eggs)));}
  if(t==='Feed'){d.quantity=Math.max(0,n(d.quantity));d.unit_cost=Math.max(0,n(d.unit_cost));d.minimum_stock=Math.max(0,n(d.minimum_stock));d.stock_value=d.quantity*d.unit_cost;if(!d.sku)d.sku=sku('FEED');}
  if(t==='Products'){
    d.quantity=Math.max(0,n(d.quantity));d.price=Math.max(0,n(d.price));d.cost_price=Math.max(0,n(d.cost_price));d.minimum_stock=Math.max(0,n(d.minimum_stock));
    if(!d.sku)d.sku=sku('PRD');
  }
  if(t==='Sales'){
    const product=find('Products',d.product_id);
    if((d.unit_price===''||d.unit_price===undefined||d.unit_price===null)&&product)d.unit_price=product.price;
    d.quantity=Math.max(0,n(d.quantity));d.unit_price=Math.max(0,n(d.unit_price));d.total=d.quantity*d.unit_price;
    if(!d.invoice)d.invoice=nextInvoice();if(!d.payment_status)d.payment_status='PENDING';if(!d.status)d.status='COMPLETED';
  }
  if(t==='Payroll'){
    if(d.employee_id){const e=find('Employees',d.employee_id);if(e&&(!d.basic_salary||n(d.basic_salary)===0))d.basic_salary=n(e.basic_salary);}
    d.net_pay=Math.max(0,n(d.basic_salary)+n(d.allowances)-n(d.deductions));
  }
  if(t==='Service_Requests'){if(!d.request_no)d.request_no='REQ-'+Utilities.getUuid().slice(0,8).toUpperCase();d.updated_at=isoNow();}
  if(t==='Chart_of_Accounts'){d.code=String(d.code||'').trim();d.account_name=String(d.account_name||'').trim();d.type=String(d.type||'').toUpperCase();d.normal_balance=String(d.normal_balance||(d.type==='ASSET'||d.type==='EXPENSE'?'DEBIT':'CREDIT')).toUpperCase();if(!d.active)d.active='TRUE';}
  if(t==='Journal'){
    d.date=d.date||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');d.debit=Math.max(0,n(d.debit));d.credit=Math.max(0,n(d.credit));
    if(d.debit>0&&d.credit>0)throw new Error('A journal line cannot have both debit and credit.');if(d.debit===0&&d.credit===0)throw new Error('Enter a debit or credit amount.');
    if(!d.reference)d.reference='JV-'+Utilities.getUuid().slice(0,8).toUpperCase();if(!d.account_code)throw new Error('Select an account code.');
    if(!findBy('Chart_of_Accounts','code',d.account_code))throw new Error('Account code does not exist.');
  }
  if(t==='Calendar'){if(!d.title)throw new Error('Event title is required.');if(!d.start_at)throw new Error('Start date/time is required.');if(!d.status)d.status='PLANNED';if(!d.priority)d.priority='NORMAL';}
  if(t==='Tasks'){if(!d.task_no)d.task_no='TASK-'+Utilities.getUuid().slice(0,8).toUpperCase();if(!d.status)d.status='OPEN';d.progress=Math.max(0,Math.min(100,n(d.progress)));d.updated_at=isoNow();}
  if(t==='Shared_Files'||t==='Management_Files'){if(!d.url)throw new Error('File URL is required.');if(!d.active)d.active='TRUE';}
  return d;
}
function sku(prefix){return prefix+'-'+Utilities.getUuid().replace(/-/g,'').slice(0,10).toUpperCase();}
function nextInvoice(){
  const rows=list('Sales'),year=Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy');
  let max=0;rows.forEach(r=>{const m=String(r.invoice||'').match(/^INV-(\d{4})-(\d+)$/);if(m&&m[1]===year)max=Math.max(max,Number(m[2]));});
  return 'INV-'+year+'-'+String(max+1).padStart(5,'0');
}

function create(t,input,user){
  if(t==='Settings'||READ_ONLY.indexOf(t)>=0)throw new Error('This table is system managed.');
  const d=clean(t,input);
  if(t==='Users'&&(!d.password_hash||list(t).some(x=>x.username===d.username)))throw new Error(d.password_hash?'Username already exists.':'Password is required.');
  if((t==='Chart_of_Accounts'||t==='Products'||t==='Feed')&&d.sku&&t!=='Chart_of_Accounts'&&findBy(t,'sku',d.sku))throw new Error('SKU already exists.');
  if(t==='Chart_of_Accounts'&&findBy(t,'code',d.code))throw new Error('Account code already exists.');
  const record=Object.assign({},d,{id:Utilities.getUuid(),created_at:isoNow()});
  if(t==='Service_Requests'){record.requested_by=user.id;record.updated_at=record.created_at;}
  if(t==='Calendar'||t==='Tasks'||t==='Sales'||t==='Expenses'||t==='Payroll')record.created_by=user.id;
  if(t==='Shared_Files'||t==='Management_Files')record.uploaded_by=user.id;
  sh(t).appendRow(TABLES[t].map(k=>record[k]!==undefined&&record[k]!==null?record[k]:''));
  audit(user,'CREATE',t,record.id,'SUCCESS','Record created',JSON.stringify(safeRecord(t,record)));
  if(t==='Service_Requests')notifyRequest(record);
  if(t==='Calendar'||t==='Tasks')notifyAssignment(record,t);
  if(t==='Sales'){replaceSourceJournal('SALE',record.id,record,user);adjustInventoryForSale(null,record,user);}
  if(t==='Expenses')replaceSourceJournal('EXPENSE',record.id,record,user);
  if(t==='Payroll')replaceSourceJournal('PAYROLL',record.id,record,user);
  if(t==='Products')updateInventoryFromProduct(record);
  return record;
}
function update(t,id,input,user){
  const d=clean(t,input),sheet=sh(t),values=sheet.getDataRange().getValues(),idCol=TABLES[t].indexOf('id');
  for(let i=1;i<values.length;i++)if(String(values[i][idCol])===String(id)){
    const before=find(t,id)||{};
    TABLES[t].forEach((k,j)=>{if(Object.prototype.hasOwnProperty.call(d,k)&&k!=='id'&&k!=='created_at')sheet.getRange(i+1,j+1).setValue(d[k]);});
    const after=find(t,id)||Object.assign({},before,d);
    audit(user,'UPDATE',t,id,'SUCCESS','Record updated',JSON.stringify({before:safeRecord(t,before),after:safeRecord(t,after)}));
    if(t==='Service_Requests')notifyRequest(after);
    if(t==='Calendar'||t==='Tasks')notifyAssignment(after,t);
    if(t==='Sales'){replaceSourceJournal('SALE',after.id,after,user);adjustInventoryForSale(before,after,user);}
    if(t==='Expenses')replaceSourceJournal('EXPENSE',after.id,after,user);
    if(t==='Payroll')replaceSourceJournal('PAYROLL',after.id,after,user);
    return after;
  }
  throw new Error('Record not found.');
}
function del(t,id,user){
  if(user.role!=='ADMIN')throw new Error('Only Admin can delete records.');
  const sheet=sh(t),values=sheet.getDataRange().getValues(),idCol=TABLES[t].indexOf('id');
  for(let i=1;i<values.length;i++)if(String(values[i][idCol])===String(id)){
    const before=find(t,id);sheet.deleteRow(i+1);
    if(t==='Sales'||t==='Expenses'||t==='Payroll')removeSourceJournal(t==='Sales'?'SALE':t==='Expenses'?'EXPENSE':'PAYROLL',id);
    audit(user,'DELETE',t,id,'SUCCESS','Record deleted',JSON.stringify(safeRecord(t,before)));return true;
  }
  throw new Error('Record not found.');
}
function safeRecord(t,r){const c=Object.assign({},r||{});if(t==='Users')delete c.password_hash;if(t==='Payment_Transactions')delete c.raw;return c;}

function firstAdmin(username,password,name){
  if(list('Users').length)throw new Error('A user already exists. Use setupFirstAdmin() only for intentional first-time/reset setup.');
  username=String(username||'admin').trim().toLowerCase();password=String(password||'Admin@2026');
  if(!username||password.length<8)throw new Error('Valid username and a password of at least 8 characters are required.');
  const sheet=sh('Users');
  const record={id:'USR-'+Utilities.getUuid().slice(0,8).toUpperCase(),username,password_hash:hash(password),name:name||'System Administrator',role:'ADMIN',farm_id:'',active:'TRUE',created_at:isoNow()};
  sheet.appendRow(TABLES.Users.map(k=>record[k]!==undefined?record[k]:''));
  return {created:true,username:record.username,role:record.role};
}
function adminStatus(){
  const users=list('Users');
  const admins=users.filter(u=>String(u.role).toUpperCase()==='ADMIN'&&String(u.active).toUpperCase()==='TRUE');
  return {users:users.length,activeAdmins:admins.length,ready:admins.length>0};
}
function login(username,password){
  const u=list('Users').find(x=>String(x.username).toLowerCase()===String(username||'').trim().toLowerCase());
  if(!u||String(u.active).toUpperCase()!=='TRUE'||u.password_hash!==hash(password)){
    audit(null,'LOGIN','Users',u?u.id:'','FAILED','Invalid username or password',JSON.stringify({username:String(username||'').trim().toLowerCase()}));throw new Error('Invalid username or password.');
  }
  const token=Utilities.getUuid()+Utilities.getUuid(),safe={id:u.id,username:u.username,name:u.name,role:u.role};
  CacheService.getScriptCache().put('s_'+token,JSON.stringify(safe),21600);audit(safe,'LOGIN','Users',u.id,'SUCCESS','Login successful','');return {token,user:safe};
}
function session(token){const raw=token?CacheService.getScriptCache().get('s_'+token):null;if(!raw)throw new Error('Session expired. Please log in again.');return JSON.parse(raw);}
function allowed(role,table){return role==='ADMIN'||(PERMS[role]||[]).indexOf(table)>=0;}
function read(user,table){if(!TABLES[table])throw new Error('Invalid table.');if(!allowed(user.role,table))throw new Error('Access denied for '+table+'.');}
function write(user,table){if(READ_ONLY.indexOf(table)>=0)throw new Error('System table is read-only.');if(table==='Settings'&&user.role!=='ADMIN')throw new Error('Admin only.');read(user,table);}

function linked(table,field){
  const c=LINK[table]&&LINK[table][field];if(!c)return [];
  return list(c[0]).filter(r=>String(r.active||'TRUE').toUpperCase()!=='FALSE').map(r=>({id:r.id,label:c.slice(1).map(k=>r[k]).filter(v=>v!==undefined&&v!==null&&v!=='').join(' • '),data:r}));
}
function settings(){return list('Settings')[0]||{business_name:'Modaxoft Poultry',address:'Machakos, Kenya',currency:'KES',theme_color:'#b91c1c'};}
function saveSettings(d){
  const current=settings(),record=Object.assign({},current,d||{},{updated_at:isoNow()}),sheet=sh('Settings');
  if(sheet.getLastRow()<2)sheet.appendRow(TABLES.Settings.map(k=>record[k]||''));else sheet.getRange(2,1,1,TABLES.Settings.length).setValues([TABLES.Settings.map(k=>record[k]||'')]);
  return record;
}
function profile(user){const u=find('Users',user.id)||{};return {id:u.id,username:u.username,name:u.name,role:u.role,active:u.active};}
function myActivity(user,p){
  const from=String(p.from||''),to=String(p.to||''),rows=list('Audit_Log').filter(x=>String(x.user_id)===String(user.id)).filter(x=>(!from||String(x.timestamp).slice(0,10)>=from)&&(!to||String(x.timestamp).slice(0,10)<=to));
  return rows.sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));
}
function myNotes(user){return list('Notifications').filter(x=>x.recipient_type==='ALL'||(x.recipient_type==='ADMIN'&&user.role==='ADMIN')||String(x.recipient_user_id)===String(user.id)).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));}
function markRead(user,id){
  const note=find('Notifications',id);if(!note)throw new Error('Notification not found.');
  const ok=note.recipient_type==='ALL'||(note.recipient_type==='ADMIN'&&user.role==='ADMIN')||String(note.recipient_user_id)===String(user.id);if(!ok)throw new Error('Access denied.');
  update('Notifications',id,{status:'READ',read_at:isoNow()},user);
}
function notifyRequest(r){
  const d={recipient_type:r.assigned_to?'USER':'ADMIN',recipient_user_id:r.assigned_to||'',title:'Service request '+r.request_no,message:r.title,priority:r.priority||'NORMAL',status:'UNREAD',created_at:isoNow()};
  const rec=Object.assign({},d,{id:Utilities.getUuid()});sh('Notifications').appendRow(TABLES.Notifications.map(k=>rec[k]||''));
}
function notifyAssignment(r,type){
  const assigned=r.assigned_to;if(!assigned)return;
  const title=type==='Calendar'?'Scheduled event: ':'Task assigned: ';
  const message=r.title||r.task_no||'New item';
  const rec={id:Utilities.getUuid(),recipient_type:'USER',recipient_user_id:assigned,title:title+message,message:r.description||'Open the portal for details.',priority:r.priority||'NORMAL',status:'UNREAD',created_at:isoNow(),read_at:''};
  sh('Notifications').appendRow(TABLES.Notifications.map(k=>rec[k]||''));
}

function dashboard(user){
  const flocks=list('Flocks'),logs=list('Daily_Log'),sales=list('Sales'),expenses=list('Expenses'),payroll=list('Payroll');
  const mySales=sales.filter(x=>user.role==='ADMIN'||x.created_by===user.id||true); // Sales has no created_by in schema; dashboard operational totals remain role-scoped below.
  const deaths=logs.reduce((s,x)=>s+n(x.deaths)+n(x.culls),0),gross=sales.reduce((s,x)=>s+n(x.total),0),exp=expenses.reduce((s,x)=>s+n(x.amount),0),pay=payroll.reduce((s,x)=>s+n(x.net_pay),0);
  const myAudit=myActivity(user,{}),myCreates=myAudit.filter(x=>x.action==='CREATE').length,myUpdates=myAudit.filter(x=>x.action==='UPDATE').length,myFailures=myAudit.filter(x=>x.status==='FAILED').length,myTasks=list('Tasks').filter(x=>String(x.assigned_to)===String(user.id)&&String(x.status).toUpperCase()!=='DONE').length,myRequests=list('Service_Requests').filter(x=>String(x.assigned_to)===String(user.id)&&!['RESOLVED','CLOSED'].includes(String(x.status).toUpperCase())).length,myUserSales=sales.filter(x=>String(x.created_by)===String(user.id)).reduce((s,x)=>s+n(x.total),0);
  const currentBirds=Math.max(0,flocks.reduce((s,x)=>s+n(x.birds),0)-deaths);
  const accounts=list('Chart_of_Accounts').filter(x=>String(x.active).toUpperCase()!=='FALSE'),journal=list('Journal');
  const monthly={},expenseMonthly={};sales.forEach(x=>{const k=String(x.date||'').slice(0,7)||'Unknown';monthly[k]=(monthly[k]||0)+n(x.total);});expenses.forEach(x=>{const k=String(x.date||'').slice(0,7)||'Unknown';expenseMonthly[k]=(expenseMonthly[k]||0)+n(x.amount);});
  const months=Object.keys(Object.assign({},monthly,expenseMonthly)).sort();
  return {birds:currentBirds,flocks:flocks.length,deaths,sales:gross,expenses:exp,payroll:pay,profit:gross-exp-pay,employees:list('Employees').filter(x=>String(x.status).toUpperCase()==='ACTIVE').length,lowFeed:list('Feed').filter(x=>n(x.quantity)<=n(x.minimum_stock)).length,notifications:myNotes(user).filter(x=>x.status!=='READ').length,accounts:accounts.length,journalLines:journal.length,myActivityCount:myAudit.length,myCreates,myUpdates,myFailures,myTasks,myRequests,mySales:myUserSales,monthly:months.map(m=>({month:m,sales:monthly[m]||0,expenses:expenseMonthly[m]||0}))};
}

function ledger(p){
  const code=String(p.account_code||'').trim();if(!code)throw new Error('Select an account.');
  const account=findBy('Chart_of_Accounts','code',code);if(!account)throw new Error('Account not found.');
  const from=String(p.from||''),to=String(p.to||''),lines=list('Journal').filter(x=>String(x.account_code)===code).filter(x=>{const d=String(x.date||'').slice(0,10);return(!from||d>=from)&&(!to||d<=to);}).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.created_at).localeCompare(String(b.created_at)));
  let running=0;const rows=lines.map(x=>{running+=account.normal_balance==='DEBIT'?n(x.debit)-n(x.credit):n(x.credit)-n(x.debit);return Object.assign({},x,{running_balance:running});});
  return {account,rows,total_debit:lines.reduce((s,x)=>s+n(x.debit),0),total_credit:lines.reduce((s,x)=>s+n(x.credit),0),closing_balance:running};
}
function trialBalance(p){
  const from=String(p.from||''),to=String(p.to||''),accounts=list('Chart_of_Accounts').filter(a=>String(a.active).toUpperCase()!=='FALSE'),journals=list('Journal').filter(x=>{const d=String(x.date||'').slice(0,10);return(!from||d>=from)&&(!to||d<=to);});
  const rows=accounts.map(a=>{const lines=journals.filter(x=>String(x.account_code)===String(a.code));return Object.assign({},a,{debit:lines.reduce((s,x)=>s+n(x.debit),0),credit:lines.reduce((s,x)=>s+n(x.credit),0)});}).filter(x=>x.debit!==0||x.credit!==0);
  return {rows,total_debit:rows.reduce((s,x)=>s+x.debit,0),total_credit:rows.reduce((s,x)=>s+x.credit,0)};
}
function accountStatement(p){return ledger(p);}

function appendJournal(lines,user){
  if(!lines||!lines.length)return;const rows=lines.map(x=>{const d=clean('Journal',x),r={id:Utilities.getUuid(),date:d.date,reference:d.reference,account_code:d.account_code,description:d.description||'',debit:d.debit,credit:d.credit,source:d.source||'',source_id:d.source_id||'',created_by:user?user.id:'SYSTEM',created_at:isoNow()};return TABLES.Journal.map(k=>r[k]||'');});
  sh('Journal').getRange(sh('Journal').getLastRow()+1,1,rows.length,TABLES.Journal.length).setValues(rows);
}
function removeSourceJournal(source,sourceId){
  const sheet=sh('Journal'),values=sheet.getDataRange().getValues(),sc=TABLES.Journal.indexOf('source'),ic=TABLES.Journal.indexOf('source_id');
  for(let i=values.length-1;i>=1;i--)if(String(values[i][sc])===String(source)&&String(values[i][ic])===String(sourceId))sheet.deleteRow(i+1);
}
function replaceSourceJournal(source,id,record,user){removeSourceJournal(source,id);if(source==='SALE')postSaleToJournal(record,user);if(source==='EXPENSE')postExpenseToJournal(record,user);if(source==='PAYROLL')postPayrollToJournal(record,user);}
function postSaleToJournal(sale,user){
  if(String(sale.status).toUpperCase()==='VOID'||!n(sale.total))return;
  const amount=n(sale.total),paystack=String(sale.payment_reference||'').trim();
  const debitAccount=String(sale.payment_status).toUpperCase()==='PENDING'||String(sale.payment_status).toUpperCase()==='PARTIAL'?'1100':(paystack?'1020':'1000');
  appendJournal([{date:sale.date,reference:sale.invoice,account_code:debitAccount,description:(paystack?'Paystack ':'Cash ')+'sale '+sale.invoice,debit:amount,credit:0,source:'SALE',source_id:sale.id},{date:sale.date,reference:sale.invoice,account_code:'4000',description:'Poultry/product sale '+sale.invoice,debit:0,credit:amount,source:'SALE',source_id:sale.id}],user);
}
function postExpenseToJournal(e,user){
  const amount=n(e.amount);if(!amount)return;appendJournal([{date:e.date,reference:'EXP-'+e.id.slice(0,8),account_code:'5070',description:e.description||e.category||'Farm expense',debit:amount,credit:0,source:'EXPENSE',source_id:e.id},{date:e.date,reference:'EXP-'+e.id.slice(0,8),account_code:'1000',description:'Cash paid for expense',debit:0,credit:amount,source:'EXPENSE',source_id:e.id}],user);
}
function postPayrollToJournal(p,user){
  const amount=n(p.net_pay);if(!amount)return;const dt=String(p.period||'').slice(0,10)||Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd');
  appendJournal([{date:dt,reference:'PAY-'+p.id.slice(0,8),account_code:'5050',description:'Payroll '+(p.period||''),debit:amount,credit:0,source:'PAYROLL',source_id:p.id},{date:dt,reference:'PAY-'+p.id.slice(0,8),account_code:'1000',description:'Payroll cash payment',debit:0,credit:amount,source:'PAYROLL',source_id:p.id}],user);
}
function updateInventoryFromProduct(record){/* quantity is maintained on Products. */}
function adjustInventoryForSale(before,after,user){
  const oldActive=before&&String(before.status).toUpperCase()!=='VOID';
  const newActive=String(after.status||'').toUpperCase()!=='VOID';
  const oldQty=oldActive?n(before.quantity):0,newQty=newActive?n(after.quantity):0;
  const oldProduct=before&&before.product_id?find('Products',before.product_id):null;
  const newProduct=after&&after.product_id?find('Products',after.product_id):null;
  if(newProduct&&newQty){
    const available=n(newProduct.quantity)+(oldProduct&&String(oldProduct.id)===String(newProduct.id)?oldQty:0);
    if(available<newQty)throw new Error('Insufficient inventory for SKU '+newProduct.sku+'. Available: '+available);
  }
  if(oldProduct&&oldQty)changeProductQty(oldProduct.id,oldQty,user,'SALE_REVERSAL');
  if(newProduct&&newQty)changeProductQty(newProduct.id,-newQty,user,'SALE');
}
function changeProductQty(productId,delta,user,reason){
  const p=find('Products',productId);if(!p)return;
  const next=Math.max(0,n(p.quantity)+delta);
  if(delta<0&&next===0&&n(p.quantity)+delta<0)throw new Error('Insufficient inventory for SKU '+p.sku+'. Available: '+p.quantity);
  const sheet=sh('Products'),values=sheet.getDataRange().getValues(),idCol=TABLES.Products.indexOf('id'),qCol=TABLES.Products.indexOf('quantity');
  for(let i=1;i<values.length;i++)if(String(values[i][idCol])===String(productId)){sheet.getRange(i+1,qCol+1).setValue(next);audit(user,'INVENTORY_ADJUST','Products',productId,'SUCCESS',reason,JSON.stringify({sku:p.sku,delta,old_quantity:p.quantity,new_quantity:next}));return;}
}

function audit(user,action,tableName,recordId,status,message,details){
  try{const r={id:Utilities.getUuid(),timestamp:isoNow(),user_id:user&&user.id?user.id:'',username:user&&user.username?user.username:'SYSTEM',action:action||'',table_name:tableName||'',record_id:recordId||'',status:status||'',message:message||'',details:details||''};const sheet=ss().getSheetByName('Audit_Log');if(sheet)sheet.appendRow(TABLES.Audit_Log.map(k=>r[k]||''));}catch(ignore){}
}
function auditReport(p){
  let rows=list('Audit_Log');const from=String(p.from||''),to=String(p.to||''),uid=String(p.user_id||''),action=String(p.action||'').toUpperCase(),table=String(p.table_name||''),status=String(p.status||'').toUpperCase();
  rows=rows.filter(x=>(!from||String(x.timestamp).slice(0,10)>=from)&&(!to||String(x.timestamp).slice(0,10)<=to)&&(!uid||String(x.user_id)===uid)&&(!action||String(x.action).toUpperCase()===action)&&(!table||String(x.table_name)===table)&&(!status||String(x.status).toUpperCase()===status));
  return rows.sort((a,b)=>String(b.timestamp).localeCompare(String(a.timestamp)));
}

function invoiceData(user,id){
  const sale=find('Sales',id);if(!sale)throw new Error('Invoice not found.');
  const customer=sale.customer_id?find('Customers',sale.customer_id):null,product=sale.product_id?find('Products',sale.product_id):null;
  return {business:settings(),sale,customer,product};
}
function filterInvoices(p){
  const from=String(p.from||''),to=String(p.to||''),q=String(p.q||'').toLowerCase();
  return list('Sales').filter(x=>(!from||String(x.date).slice(0,10)>=from)&&(!to||String(x.date).slice(0,10)<=to)&&(!q||JSON.stringify(x).toLowerCase().indexOf(q)>=0));
}

function setPaystackConfig(publicKey,secretKey){
  if(!publicKey||!secretKey)throw new Error('Both Paystack public and secret keys are required.');
  PropertiesService.getScriptProperties().setProperties({PAYSTACK_PUBLIC_KEY:String(publicKey),PAYSTACK_SECRET_KEY:String(secretKey)},true);
  return {saved:true,publicKey:String(publicKey)};
}
function paystackPublicConfig(){return {publicKey:PropertiesService.getScriptProperties().getProperty('PAYSTACK_PUBLIC_KEY')||''};}
function savePaystackConfig(d){
  if(!d||!d.publicKey||!d.secretKey)throw new Error('Enter both Paystack public and secret keys.');
  PropertiesService.getScriptProperties().setProperties({PAYSTACK_PUBLIC_KEY:String(d.publicKey).trim(),PAYSTACK_SECRET_KEY:String(d.secretKey).trim()},true);
  return {saved:true,publicKey:String(d.publicKey).trim(),secretConfigured:true};
}
function paystackHeaders(){const k=PropertiesService.getScriptProperties().getProperty('PAYSTACK_SECRET_KEY');if(!k)throw new Error('Paystack secret key has not been configured.');return {Authorization:'Bearer '+k,ContentType:'application/json'};}
function createPaymentReference(user,p){
  const sale=find('Sales',p.sale_id);if(!sale)throw new Error('Sale not found.');
  if(!n(sale.total))throw new Error('Sale total is zero.');
  const ref='MODA-'+Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase();
  const customer=sale.customer_id?find('Customers',sale.customer_id):null;
  const email=(p.email||customer&&customer.email||settings().email||'').trim();
  return {reference:ref,amount:n(sale.total),currency:settings().currency||'KES',email};
}
function initializePayment(user,p){
  const sale=find('Sales',p.sale_id);if(!sale)throw new Error('Sale not found.');
  if(String(sale.payment_status).toUpperCase()==='PAID')throw new Error('Invoice is already paid.');
  const h=paystackHeaders(),customer=sale.customer_id?find('Customers',sale.customer_id):null,email=String(p.email||customer&&customer.email||'').trim();
  if(!email)throw new Error('A customer email is required for Paystack checkout.');
  const ref='MODA-'+Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase();
  const payload={amount:Math.round(n(sale.total)*100),email:email,currency:settings().currency||'KES',reference:ref,metadata:{sale_id:sale.id,invoice:sale.invoice}};
  const res=UrlFetchApp.fetch('https://api.paystack.co/transaction/initialize',{method:'post',headers:{Authorization:h.Authorization,ContentType:'application/json'},payload:JSON.stringify(payload),muteHttpExceptions:true});
  const code=res.getResponseCode(),json=JSON.parse(res.getContentText()||'{}');if(code<200||code>=300||!json.status)throw new Error(json.message||'Paystack initialization failed.');
  const tx=json.data,rec={id:Utilities.getUuid(),reference:ref,invoice:sale.invoice,sale_id:sale.id,amount:n(sale.total),currency:settings().currency||'KES',channel:'',status:'pending',paid_at:'',customer_email:email,raw:JSON.stringify(tx),created_at:isoNow()};
  sh('Payment_Transactions').appendRow(TABLES.Payment_Transactions.map(k=>rec[k]||''));
  audit(user,'PAYMENT_INIT','Payment_Transactions',rec.id,'SUCCESS','Paystack checkout initialized',JSON.stringify({reference:ref,sale_id:sale.id,amount:rec.amount}));
  return {reference:ref,authorization_url:tx.authorization_url,access_code:tx.access_code,amount:rec.amount,currency:rec.currency};
}
function verifyPayment(user,reference){
  if(!reference)throw new Error('Payment reference required.');
  const h=paystackHeaders(),res=UrlFetchApp.fetch('https://api.paystack.co/transaction/verify/'+encodeURIComponent(reference),{method:'get',headers:{Authorization:h.Authorization},muteHttpExceptions:true});
  const code=res.getResponseCode(),json=JSON.parse(res.getContentText()||'{}');if(code<200||code>=300||!json.status)throw new Error(json.message||'Paystack verification failed.');
  const tx=json.data,amount=n(tx.amount)/100,ref=String(tx.reference||reference);
  let existing=findBy('Payment_Transactions','reference',ref);
  const raw=JSON.stringify(tx);
  if(!existing){const r={id:Utilities.getUuid(),reference:ref,invoice:'',sale_id:'',amount,currency:tx.currency||settings().currency,channel:tx.channel||'',status:tx.status||'',paid_at:tx.paid_at||'',customer_email:tx.customer&&tx.customer.email||'',raw,created_at:isoNow()};sh('Payment_Transactions').appendRow(TABLES.Payment_Transactions.map(k=>r[k]||''));}
  audit(user,'PAYMENT_VERIFY','Payment_Transactions',ref,'SUCCESS','Paystack payment verified',JSON.stringify({reference:ref,amount,status:tx.status}));
  return {reference:ref,status:tx.status,amount,currency:tx.currency,paid_at:tx.paid_at};
}
function syncPaystack(user,p){
  const v=verifyPayment(user,p.reference),saleId=p.sale_id;if(v.status!=='success')throw new Error('Paystack transaction is not successful.');
  if(saleId){
    const sale=find('Sales',saleId);if(!sale)throw new Error('Sale not found.');
    if(Math.abs(n(sale.total)-n(v.amount))>0.01)throw new Error('Payment amount does not match the invoice total.');
    update('Sales',saleId,{payment_status:'PAID',payment_reference:v.reference},user);
    const pt=findBy('Payment_Transactions','reference',v.reference);
    if(pt)updatePaymentTransaction(pt.id,{sale_id:sale.id,invoice:sale.invoice});
  }
  return v;
}
function updatePaymentTransaction(id,patch){
  const sheet=sh('Payment_Transactions'),values=sheet.getDataRange().getValues(),idCol=TABLES.Payment_Transactions.indexOf('id');
  for(let i=1;i<values.length;i++)if(String(values[i][idCol])===String(id)){TABLES.Payment_Transactions.forEach((k,j)=>{if(Object.prototype.hasOwnProperty.call(patch,k))sheet.getRange(i+1,j+1).setValue(patch[k]);});return true;}
  return false;
}
function handlePaystackWebhook(payload){
  // Webhook authenticity is verified using the Paystack signature in a real HTTP webhook.
  // Apps Script web-app requests cannot reliably expose the raw HTTP signature through this JSON API.
  // Therefore this handler records only a supplied event; financial posting must use verifyPayment().
  const ref=payload&&payload.data&&payload.data.reference?payload.data.reference:payload&&payload.reference;
  return {received:true,reference:ref||'',next:'Use verifyPayment() against Paystack API before posting funds.'};
}

function onEdit(e){
  try{
    if(!e||!e.range)return;const range=e.range,sheet=range.getSheet(),table=sheet.getName(),row=range.getRow();if(row<2||!TABLES[table])return;
    const headers=TABLES[table],idCol=headers.indexOf('id')+1;
    if(idCol>0&&!sheet.getRange(row,idCol).getValue())sheet.getRange(row,idCol).setValue(Utilities.getUuid());
    const value=k=>{const c=headers.indexOf(k)+1;return c>0?sheet.getRange(row,c).getValue():'';},set=(k,v)=>{const c=headers.indexOf(k)+1;if(c>0)sheet.getRange(row,c).setValue(v);};
    if(table==='Feed')set('stock_value',n(value('quantity'))*n(value('unit_cost')));
    if(table==='Products'){if(!value('sku'))set('sku',sku('PRD'));if(n(value('price'))<0)set('price',0);}
    if(table==='Sales'){set('total',n(value('quantity'))*n(value('unit_price')));if(!value('invoice'))set('invoice',nextInvoice());}
    if(table==='Payroll'){const emp=find('Employees',value('employee_id'));if(emp&&!n(value('basic_salary')))set('basic_salary',n(emp.basic_salary));set('net_pay',n(value('basic_salary'))+n(value('allowances'))-n(value('deductions')));}
  }catch(ignore){}
}
function setupFirstAdmin(){
  const sheet=ss().getSheetByName('Users')||ss().insertSheet('Users');
  migrateHeaders(sheet,TABLES.Users);
  const users=list('Users');
  if(users.length)throw new Error('Users already exist. This function will not overwrite them. Delete/reset Users intentionally if you really need a first-admin reset.');
  const record={id:'USR-'+Utilities.getUuid().slice(0,8).toUpperCase(),username:'admin',password_hash:hash('Admin@2026'),name:'System Administrator',role:'ADMIN',farm_id:'',active:'TRUE',created_at:isoNow()};
  sheet.appendRow(TABLES.Users.map(k=>record[k]!==undefined?record[k]:''));
  return {created:true,username:'admin',password:'Admin@2026'};
}
function forceResetAdmin(){
  const sheet=ss().getSheetByName('Users')||ss().insertSheet('Users');
  migrateHeaders(sheet,TABLES.Users);
  const users=list('Users');
  const admin=users.find(u=>String(u.username).toLowerCase()==='admin');
  const now=isoNow();
  if(admin){
    const values=sheet.getDataRange().getValues(),idCol=TABLES.Users.indexOf('id'),passCol=TABLES.Users.indexOf('password_hash'),nameCol=TABLES.Users.indexOf('name'),roleCol=TABLES.Users.indexOf('role'),activeCol=TABLES.Users.indexOf('active');
    for(let i=1;i<values.length;i++)if(String(values[i][idCol])===String(admin.id)){sheet.getRange(i+1,passCol+1).setValue(hash('Admin@2026'));sheet.getRange(i+1,nameCol+1).setValue('System Administrator');sheet.getRange(i+1,roleCol+1).setValue('ADMIN');sheet.getRange(i+1,activeCol+1).setValue('TRUE');return {reset:true,username:'admin',password:'Admin@2026'};}}
  return setupFirstAdmin();
}

/**
 * Run this once from Apps Script editor to install a 15-minute alert trigger.
 * It sends notifications for calendar items/tasks due soon.
 */
function installAlertTrigger(){
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='sendScheduledAlerts').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('sendScheduledAlerts').timeBased().everyMinutes(15).create();
}
function sendScheduledAlerts(){
  const now=new Date(),soon=new Date(now.getTime()+60*60*1000);
  const users=list('Users').filter(u=>String(u.active).toUpperCase()==='TRUE');
  list('Calendar').forEach(x=>{
    const d=new Date(x.start_at);if(isNaN(d))return;
    if(d>=now&&d<=soon&&x.assigned_to)createSystemNotification(x.assigned_to,'Upcoming: '+x.title,x.description||'Scheduled item starts soon.',x.priority||'NORMAL');
  });
  list('Tasks').forEach(x=>{
    const d=new Date(x.due_date);if(isNaN(d))return;
    const day=String(x.due_date).slice(0,10);
    const today=Utilities.formatDate(now,Session.getScriptTimeZone(),'yyyy-MM-dd');
    if(day===today&&x.assigned_to)createSystemNotification(x.assigned_to,'Task due today: '+x.title,x.description||'Task is due today.',x.priority||'HIGH');
  });
}
function createSystemNotification(userId,title,message,priority){
  if(!userId)return;
  const existing=list('Notifications').find(x=>String(x.recipient_user_id)===String(userId)&&x.title===title&&String(x.status).toUpperCase()==='UNREAD'&&String(x.created_at).slice(0,10)===Utilities.formatDate(new Date(),Session.getScriptTimeZone(),'yyyy-MM-dd'));
  if(existing)return;
  const r={id:Utilities.getUuid(),recipient_type:'USER',recipient_user_id:userId,title,message,priority,status:'UNREAD',created_at:isoNow(),read_at:''};
  sh('Notifications').appendRow(TABLES.Notifications.map(k=>r[k]||''));
}
