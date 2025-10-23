// =================== Enhanced script.js ===================

// ---------- Persistent data ----------
const defaultBooks = [
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", category: "Fiction", image: "https://via.placeholder.com/300x420?text=Book" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", category: "Drama", image: "https://via.placeholder.com/300x420?text=Book" },
  { title: "1984", author: "George Orwell", category: "Dystopian", image: "https://via.placeholder.com/300x420?text=Book" }
];

let books = JSON.parse(localStorage.getItem('books')) || defaultBooks;
let borrowRequests = JSON.parse(localStorage.getItem('borrowRequests')) || [];
let borrowedBooks = JSON.parse(localStorage.getItem('borrowedBooks')) || [];

const $ = id => document.getElementById(id);
const safe = (el, fallback=null) => el ? el : fallback;
const escapeHtml = s => typeof s === 'string' ? s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])) : s;
const showAlert = msg => alert(msg);
function persistAll(){ localStorage.setItem('books', JSON.stringify(books)); localStorage.setItem('borrowRequests', JSON.stringify(borrowRequests)); localStorage.setItem('borrowedBooks', JSON.stringify(borrowedBooks)); }

// ---------- UI helpers ----------
function hideAll(){
  ['home','login','dashboard','adminBooks','userPage','borrowRequests','addBookModal'].forEach(id=>{
    const el=$(id); if(el) el.style.display='none';
  });
}
function updateRequestCount(){
  const badge=$('requestCount');
  if(!badge)return;
  const n=borrowRequests.length;
  badge.textContent=n;
  badge.style.display=n>0?'inline-block':'none';
}

// ---------- Borrow Requests Panel ----------
function ensureBorrowRequestsPanel(){
  if ($('borrowRequests')) return;
  const panel=document.createElement('div');
  panel.id='borrowRequests';
  panel.style.display='none';
  panel.innerHTML=`
    <div class="admin-books-overlay">
      <div class="admin-books-card">
        <h2>📩 Borrow Requests</h2>
        <div id="requestList" class="book-list"></div>
        <div style="text-align:center;margin-top:16px;"><div class="back-btn" id="brBack">⬅ Back</div></div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  $('brBack').onclick=()=>{ hideAll(); $('dashboard').style.display='block'; updateRequestCount(); };
}

// ---------- Add Book Modal ----------
function showAddBookModal(){
  if ($('addBookModal')) { $('addBookModal').style.display='flex'; return; }

  const modal=document.createElement('div');
  modal.id='addBookModal';
  modal.className='modal';
  modal.innerHTML=`
  <div class="modal-content">
    <span class="close-btn" id="addClose">&times;</span>
    <h3>Add New Book</h3>
    <input id="tempTitle" placeholder="Book Title" class="form-input">
    <input id="tempAuthor" placeholder="Author Name" class="form-input">
    <input id="tempCategory" placeholder="Category (e.g. Fiction)" class="form-input">
    <label for="tempImage" style="display:block;text-align:left;margin-bottom:8px;font-weight:500;color:#444;">Upload Cover:</label>
    <input id="tempImage" type="file" accept="image/*" class="form-input">
    <button id="tempAddBtn" class="main-btn" style="width:100%;margin-top:10px;">Add Book</button>
  </div>`;
  document.body.appendChild(modal);

  $('addClose').onclick=()=>modal.style.display='none';
  modal.onclick=e=>{if(e.target===modal)modal.style.display='none';};
  $('tempAddBtn').onclick=()=>{
    const t=$('tempTitle').value.trim(), a=$('tempAuthor').value.trim(), c=$('tempCategory').value.trim();
    const f=$('tempImage');
    if(!t||!a||!c){showAlert('Please fill all fields');return;}
    if(f.files&&f.files[0]){
      const r=new FileReader();
      r.onload=e=>{saveNewBook(t,a,c,e.target.result);modal.style.display='none';};
      r.readAsDataURL(f.files[0]);
    }else saveNewBook(t,a,c,'https://via.placeholder.com/300x420?text=No+Image');
  };
}
function saveNewBook(title, author, category, image){
  let finalTitle=title, c=1;
  while(books.some(b=>b.title===finalTitle)){ finalTitle=`${title} (${c++})`; }
  books.push({title:finalTitle,author,category,image});
  persistAll(); renderAdminBooks(); updateCategoryFilter(); showAlert('✅ Book added');
}

// ---------- Render Functions ----------
function renderAdminBooks(){
  const list=$('adminBookList');
  if(!list)return;
  list.innerHTML='';
  books.forEach((b,i)=>{
    const d=document.createElement('div');
    d.className='book';
    d.innerHTML=`
      <img src="${escapeHtml(b.image)}" class="book-img">
      <h4>${escapeHtml(b.title)}</h4>
      <p>${escapeHtml(b.author)}</p>
      <p class="book-category">${escapeHtml(b.category)}</p>
      <button class="delete-btn" data-idx="${i}">Delete</button>`;
    list.appendChild(d);
  });
  list.querySelectorAll('.delete-btn').forEach(btn=>btn.onclick=()=>{
    const i=btn.dataset.idx;
    const title=books[i].title;
    if(!confirm(`Delete "${title}"?`))return;
    books.splice(i,1);
    borrowRequests=borrowRequests.filter(r=>r.title!==title);
    borrowedBooks=borrowedBooks.filter(b=>b.title!==title);
    persistAll(); renderAdminBooks(); renderBorrowRequests(); updateRequestCount();
  });
}

function renderUserBooks(){
  const list=$('userBookList');
  if(!list)return;
  list.innerHTML='';
  books.forEach(book=>{
    const borrowed=borrowedBooks.find(b=>b.title===book.title);
    const now=new Date();
    let status='', daysLeft=0;
    if(borrowed){
      const rDate=new Date(borrowed.returnDate);
      daysLeft=Math.ceil((rDate-now)/(1000*60*60*24));
      if(daysLeft>0) status=`⏳ ${daysLeft} day${daysLeft>1?'s':''} left`;
      else status='✅ Returned';
    }

    const div=document.createElement('div');
    div.className='book';
    div.innerHTML=`
      <img src="${escapeHtml(book.image)}" class="book-img">
      <h4>${escapeHtml(book.title)}</h4>
      <p>${escapeHtml(book.author)}</p>
      <p class="book-category">${escapeHtml(book.category)}</p>
      ${status ? `<p style="color:#555;font-size:14px;margin-top:6px">${status}</p>` : ''}
    `;
    div.onclick=()=>openModal(book);
    list.appendChild(div);
  });
}

// ---------- Borrow Requests ----------
function renderBorrowRequests(){
  const c=$('requestList');
  if(!c)return;
  c.innerHTML='';
  if(!borrowRequests.length){c.innerHTML='<p>No borrow requests</p>';return;}
  borrowRequests.forEach((r,i)=>{
    const d=document.createElement('div');
    d.className='book';
    d.innerHTML=`
      <img src="${escapeHtml(r.image)}" class="book-img">
      <h4>${escapeHtml(r.title)}</h4>
      <p>${escapeHtml(r.author)}</p>
      <p>${escapeHtml(r.category)}</p>
      <label>Return in (days): <input id="returnDays${i}" type="number" min="1" max="365" value="7"></label>
      <div><button class="approve-btn" data-idx="${i}">Approve</button><button class="deny-btn" data-idx="${i}" style="background:#e74c3c">Deny</button></div>`;
    c.appendChild(d);
  });
  c.querySelectorAll('.approve-btn').forEach(b=>b.onclick=()=>approveBorrow(b.dataset.idx));
  c.querySelectorAll('.deny-btn').forEach(b=>b.onclick=()=>denyBorrow(b.dataset.idx));
}

// ---------- Modal ----------
function openModal(book){
  const m=$('bookModal');
  if(!m)return;
  $('modalBookImg').src=book.image;
  $('modalBookTitle').textContent=book.title;
  $('modalBookAuthor').textContent='Author: '+book.author;
  $('modalBookCategory').textContent='Category: '+book.category;

  const btn=$('borrowBtn');
  const borrowed=borrowedBooks.find(b=>b.title===book.title);
  const requested=borrowRequests.find(r=>r.title===book.title);
  const now=new Date();
  const active=borrowed && new Date(borrowed.returnDate)>now;

  btn.disabled=active||!!requested;
  btn.textContent=active ? 'Already Borrowed' : (requested?'Request Pending':'📚 Borrow Book');
  btn.dataset.title=book.title;
  m.style.display='flex';
}
function closeModal(){const m=$('bookModal');if(m)m.style.display='none';}
window.onclick=e=>{const m=$('bookModal');if(m&&e.target===m)m.style.display='none';};

// ---------- Borrow Behavior ----------
function borrowBook(){
  const t=$('borrowBtn').dataset.title;
  const book=books.find(b=>b.title===t);
  if(!book)return;
  if(borrowRequests.some(r=>r.title===t))return showAlert('Request already pending');
  borrowRequests.push({...book,dateRequested:new Date().toISOString()});
  persistAll(); updateRequestCount(); showAlert('Request sent'); closeModal();
}

// ---------- Approve / Deny ----------
function approveBorrow(i){
  const idx=parseInt(i);
  const req=borrowRequests[idx]; if(!req)return;
  const dInput=$(`returnDays${idx}`); const days=Math.max(1,parseInt(dInput.value)||7);
  const returnDate=new Date(); returnDate.setDate(returnDate.getDate()+days);
  borrowedBooks.push({...req,returnDate:returnDate.toISOString()});
  borrowRequests.splice(idx,1);
  persistAll();
  renderBorrowRequests(); updateRequestCount();
  showAlert(`Approved. Return by ${returnDate.toDateString()}`);
  renderUserBooks();
}
function denyBorrow(i){
  borrowRequests.splice(i,1);
  persistAll(); renderBorrowRequests(); updateRequestCount();
  showAlert('Request denied');
}

// ---------- Search & Filter ----------
function updateCategoryFilter(){
  const sel=$('filterCategory'); if(!sel)return;
  const cats=[...new Set(books.map(b=>b.category))];
  sel.innerHTML=`<option value="all">All</option>${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}`;
}
function filterByCategory(){
  const val=$('filterCategory').value;
  renderUserBooks(val==='all'?books:books.filter(b=>b.category===val));
}
function searchBooks(){
  const q=$('searchInput').value.toLowerCase();
  const cat=$('filterCategory').value;
  let arr=books.filter(b=>b.title.toLowerCase().includes(q)||b.author.toLowerCase().includes(q));
  if(cat!=='all')arr=arr.filter(b=>b.category===cat);
  renderUserBooks(arr);
}

// ---------- Initialization ----------
function init(){
  ensureBorrowRequestsPanel();
  window.openAddBook=showAddBookModal;
  window.showLogin=()=>{hideAll();$('login').style.display='block';};
  window.showUser=()=>{hideAll();$('userPage').style.display='block';updateCategoryFilter();renderUserBooks();};
  window.goHome=()=>{hideAll();$('home').style.display='block';};
  window.login=()=>{
    const e=$('email').value.trim(), p=$('password').value.trim();
    if(e==='admin@me.com'&&p==='admin123'){hideAll();$('dashboard').style.display='block';updateRequestCount();showAlert('Login successful');}
    else showAlert('Invalid credentials');
  };
  window.logout=()=>{hideAll();$('home').style.display='block';};
  window.openBookList=()=>{hideAll();$('adminBooks').style.display='block';renderAdminBooks();};
  window.openBorrowRequests=()=>{hideAll();$('borrowRequests').style.display='block';renderBorrowRequests();};
  window.backToDashboard=()=>{hideAll();$('dashboard').style.display='block';};
  $('borrowBtn').onclick=borrowBook;

  renderAdminBooks(); updateCategoryFilter(); renderUserBooks(); updateRequestCount();
}
// ===== INTRO VIDEO LOGIC =====
window.addEventListener('load', () => {
  const intro = document.getElementById('intro');
  const video = document.getElementById('introVideo');
  const home = document.getElementById('home');

  // When the video ends, hide intro and show home
  if (video) {
    video.addEventListener('ended', () => {
      intro.style.display = 'none';
      home.style.display = 'block';
    });
  }
});

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
