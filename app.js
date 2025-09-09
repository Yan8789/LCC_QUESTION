// 全域變數
let questions = [];
let glossaryTerms = [];
let firebaseEnabled = false;
let questionsRef = null;
let glossaryRef = null;
let currentEditingQuestion = null;
let currentEditingGlossary = null;

// 初始化應用程式
window.initializeApp = function() {
    setupNavigation();
    
    if (typeof window.firebaseDb !== 'undefined') {
        try {
            questionsRef = window.firebaseRef(window.firebaseDb, 'questions');
            glossaryRef = window.firebaseRef(window.firebaseDb, 'glossary');
            setupFirebaseListener();
            setupGlossaryListener();
            firebaseEnabled = true;
            updateConnectionStatus('✅已連線到資料庫', true);
        } catch (error) {
            fallbackToLocalStorage();
        }
    } else {
        fallbackToLocalStorage();
    }
};

// 設定導航
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const sectionName = this.getAttribute('data-section');
            showSection(sectionName, this);
        });
    });
}

// Firebase 監聽器
function setupFirebaseListener() {
    window.firebaseOnValue(questionsRef, (snapshot) => {
        const data = snapshot.val();
        questions = data ? Object.keys(data).map(key => ({ firebaseKey: key, ...data[key] })) : [];
        updateAllViews();
    });
}

function setupGlossaryListener() {
    window.firebaseOnValue(glossaryRef, (snapshot) => {
        const data = snapshot.val();
        glossaryTerms = data ? Object.keys(data).map(key => ({ firebaseKey: key, ...data[key] })) : [];
        updateGlossaryView();
    });
}

// 回退到本地儲存
function fallbackToLocalStorage() {
    updateConnectionStatus('使用本地儲存模式', false);
    loadQuestionsFromLocal();
    loadGlossaryFromLocal();
    updateAllViews();
}

// 本地儲存
function loadQuestionsFromLocal() {
    const saved = localStorage.getItem('questions');
    questions = saved ? JSON.parse(saved) : [];
}

function loadGlossaryFromLocal() {
    const saved = localStorage.getItem('glossaryTerms');
    glossaryTerms = saved ? JSON.parse(saved) : [];
}

function saveQuestionsToLocal() {
    localStorage.setItem('questions', JSON.stringify(questions));
}

function saveGlossaryToLocal() {
    localStorage.setItem('glossaryTerms', JSON.stringify(glossaryTerms));
}

// 顯示區塊
function showSection(sectionName, clickedButton) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(sectionName).classList.add('active');
    clickedButton.classList.add('active');
    
    if (sectionName === 'manage') updateManageView();
    else if (sectionName === 'answer') updateAnswerView();
    else if (sectionName === 'glossary') updateGlossaryView();
    else if (sectionName === 'export') updateExportView();
}

// 表單控制
function toggleAddForm() {
    const form = document.getElementById('addQuestionForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function toggleGlossaryForm() {
    const form = document.getElementById('addGlossaryForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

function cancelAdd() {
    document.getElementById('addQuestionForm').style.display = 'none';
    clearForm(['questionInput', 'answerInput', 'authorInput']);
}

function cancelGlossaryAdd() {
    document.getElementById('addGlossaryForm').style.display = 'none';
    clearForm(['termInput', 'definitionInput', 'categoryInput', 'glossaryAuthorInput']);
}

function cancelEdit() {
    document.getElementById('editQuestionForm').style.display = 'none';
    clearForm(['editQuestionInput', 'editAnswerInput', 'editAuthorInput']);
    currentEditingQuestion = null;
    document.querySelectorAll('.question-text.editing').forEach(el => el.classList.remove('editing'));
}

function cancelGlossaryEdit() {
    document.getElementById('editGlossaryForm').style.display = 'none';
    clearForm(['editTermInput', 'editDefinitionInput', 'editCategoryInput', 'editGlossaryAuthorInput']);
    currentEditingGlossary = null;
    document.querySelectorAll('.question-text.editing').forEach(el => el.classList.remove('editing'));
}

function clearForm(fieldIds) {
    fieldIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
}

// 新增功能
function addQuestion() {
    const questionText = document.getElementById('questionInput').value.trim();
    const answerText = document.getElementById('answerInput').value.trim();
    const authorText = document.getElementById('authorInput').value.trim() || '匿名用戶';

    if (!questionText || !answerText) {
        alert('請填寫完整的問題和答案！');
        return;
    }

    const newQuestion = {
        id: Date.now(),
        question: questionText,
        answer: answerText,
        author: authorText,
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    questions.push(newQuestion);
    saveQuestionsToLocal();
    updateAllViews();
    cancelAdd();

    // 背景同步到 Firebase
    if (firebaseEnabled && questionsRef) {
        window.firebasePush(questionsRef, newQuestion).catch(console.error);
    }
}

function addGlossaryTerm() {
    const termText = document.getElementById('termInput').value.trim();
    const definitionText = document.getElementById('definitionInput').value.trim();
    const categoryText = document.getElementById('categoryInput').value.trim() || '一般';
    const authorText = document.getElementById('glossaryAuthorInput').value.trim() || '匿名用戶';

    if (!termText || !definitionText) {
        alert('請填寫完整的名詞和解釋！');
        return;
    }

    const newTerm = {
        id: Date.now(),
        term: termText,
        definition: definitionText,
        category: categoryText,
        author: authorText,
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    glossaryTerms.push(newTerm);
    saveGlossaryToLocal();
    updateGlossaryView();
    cancelGlossaryAdd();

    // 背景同步到 Firebase
    if (firebaseEnabled && glossaryRef) {
        window.firebasePush(glossaryRef, newTerm).catch(console.error);
    }
}

// 編輯功能
function editQuestion(firebaseKey, localId) {
    cancelEdit();
    
    const questionToEdit = firebaseKey 
        ? questions.find(q => q.firebaseKey === firebaseKey)
        : questions.find(q => q.id == localId);
    
    if (!questionToEdit) return;
    
    currentEditingQuestion = { firebaseKey, localId };
    
    document.getElementById('editQuestionInput').value = questionToEdit.question;
    document.getElementById('editAnswerInput').value = questionToEdit.answer;
    document.getElementById('editAuthorInput').value = questionToEdit.author || '';
    
    document.getElementById('addQuestionForm').style.display = 'none';
    document.getElementById('editQuestionForm').style.display = 'block';
}

function editGlossaryTerm(firebaseKey, localId) {
    cancelGlossaryEdit();
    
    const termToEdit = firebaseKey 
        ? glossaryTerms.find(t => t.firebaseKey === firebaseKey)
        : glossaryTerms.find(t => t.id == localId);
    
    if (!termToEdit) return;
    
    currentEditingGlossary = { firebaseKey, localId };
    
    document.getElementById('editTermInput').value = termToEdit.term;
    document.getElementById('editDefinitionInput').value = termToEdit.definition;
    document.getElementById('editCategoryInput').value = termToEdit.category || '';
    document.getElementById('editGlossaryAuthorInput').value = termToEdit.author || '';
    
    document.getElementById('addGlossaryForm').style.display = 'none';
    document.getElementById('editGlossaryForm').style.display = 'block';
}

function saveQuestionEdit() {
    if (!currentEditingQuestion) return;
    
    const questionText = document.getElementById('editQuestionInput').value.trim();
    const answerText = document.getElementById('editAnswerInput').value.trim();
    const authorText = document.getElementById('editAuthorInput').value.trim() || '匿名用戶';

    if (!questionText || !answerText) {
        alert('請填寫完整的問題和答案！');
        return;
    }

    const updatedQuestion = {
        question: questionText,
        answer: answerText,
        author: authorText,
        updatedAt: new Date().toLocaleString()
    };

    const questionIndex = questions.findIndex(q => q.id == currentEditingQuestion.localId);
    if (questionIndex !== -1) {
        questions[questionIndex] = { ...questions[questionIndex], ...updatedQuestion };
        saveQuestionsToLocal();
        updateAllViews();
    }
    cancelEdit();
}

function saveGlossaryEdit() {
    if (!currentEditingGlossary) return;
    
    const termText = document.getElementById('editTermInput').value.trim();
    const definitionText = document.getElementById('editDefinitionInput').value.trim();
    const categoryText = document.getElementById('editCategoryInput').value.trim() || '一般';
    const authorText = document.getElementById('editGlossaryAuthorInput').value.trim() || '匿名用戶';

    if (!termText || !definitionText) {
        alert('請填寫完整的名詞和解釋！');
        return;
    }

    const updatedTerm = {
        term: termText,
        definition: definitionText,
        category: categoryText,
        author: authorText,
        updatedAt: new Date().toLocaleString()
    };

    const termIndex = glossaryTerms.findIndex(t => t.id == currentEditingGlossary.localId);
    if (termIndex !== -1) {
        glossaryTerms[termIndex] = { ...glossaryTerms[termIndex], ...updatedTerm };
        saveGlossaryToLocal();
        updateGlossaryView();
    }
    cancelGlossaryEdit();
}

// 刪除功能
function deleteQuestion(firebaseKey, localId) {
    if (!confirm('確定要刪除這個問題嗎？')) return;
    
    questions = questions.filter(q => Number(q.id) !== Number(localId));
    saveQuestionsToLocal();
    updateAllViews();
}

function deleteGlossaryTerm(firebaseKey, localId) {
    if (!confirm('確定要刪除這個專有名詞嗎？')) return;
    
    glossaryTerms = glossaryTerms.filter(t => Number(t.id) !== Number(localId));
    saveGlossaryToLocal();
    updateGlossaryView();
}

// 切換顯示
function toggleAnswer(id) {
    const answerDiv = document.getElementById(`answer-${id}`);
    const btn = document.getElementById(`btn-${id}`);
    
    if (answerDiv.classList.contains('show')) {
        answerDiv.classList.remove('show');
        btn.textContent = '顯示答案';
    } else {
        answerDiv.classList.add('show');
        btn.textContent = '隱藏答案';
    }
}

function toggleDefinition(id) {
    const definitionDiv = document.getElementById(`definition-${id}`);
    const btn = document.getElementById(`defBtn-${id}`);
    
    if (definitionDiv.classList.contains('show')) {
        definitionDiv.classList.remove('show');
        btn.textContent = '顯示定義';
    } else {
        definitionDiv.classList.add('show');
        btn.textContent = '隱藏定義';
    }
}

// 搜尋功能
function filterGlossary() {
    const searchTerm = document.getElementById('glossarySearch').value.toLowerCase();
    const items = document.querySelectorAll('#glossaryList .question-item');
    
    items.forEach(item => {
        const termText = item.querySelector('.question-text').textContent.toLowerCase();
        const definitionText = item.querySelector('.answer-text')?.textContent.toLowerCase() || '';
        item.style.display = (termText.includes(searchTerm) || definitionText.includes(searchTerm)) ? 'block' : 'none';
    });
}

// 視圖更新
function updateManageView() {
    const container = document.getElementById('questionsList');
    
    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 20px;">📝</div><p>尚未新增任何問題</p></div>';
        return;
    }

    const sortedQuestions = [...questions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    container.innerHTML = sortedQuestions.map(q => {
        const isNew = q.timestamp && (Date.now() - q.timestamp < 300000);
        const updateInfo = q.updatedAt ? `<br><small style="color: #28a745;">已更新：${q.updatedAt}</small>` : '';
        
        return `
            <div class="question-item ${isNew ? 'new' : ''}">
                <div class="question-header">
                    <div class="question-text" onclick="editQuestion('${q.firebaseKey || ''}', '${q.id}')" title="點擊編輯">
                        ${escapeHtml(q.question)}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn" onclick="editQuestion('${q.firebaseKey || ''}', '${q.id}')" style="background: #17a2b8; padding: 8px 16px; font-size: 14px;">編輯</button>
                        <button class="btn-danger btn" onclick="deleteQuestion('${q.firebaseKey || ''}', '${q.id}')">刪除</button>
                    </div>
                </div>
                <div style="color: #6c757d; font-size: 14px; margin-top: 10px;">
                    發布者：${escapeHtml(q.author || '匿名用戶')} | 建立時間：${q.createdAt}${updateInfo}
                </div>
            </div>
        `;
    }).join('');
}

function updateAnswerView() {
    const container = document.getElementById('answerQuestionsList');
    
    if (questions.length === 0) {
        container.innerHTML = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 20px;">❓</div><p>尚未有任何問題</p></div>';
        return;
    }

    const sortedQuestions = [...questions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    
    container.innerHTML = sortedQuestions.map(q => {
        const uniqueId = q.firebaseKey || q.id;
        return `
            <div class="question-item">
                <div class="question-text">${escapeHtml(q.question)}</div>
                <div style="color: #6c757d; font-size: 14px; margin: 10px 0;">
                    發布者：${escapeHtml(q.author || '匿名用戶')}
                </div>
                <button class="show-answer-btn" id="btn-${uniqueId}" onclick="toggleAnswer('${uniqueId}')">顯示答案</button>
                <div class="answer-text" id="answer-${uniqueId}">
                    <strong>答案：</strong><br>
                    ${escapeHtml(q.answer)}
                </div>
            </div>
        `;
    }).join('');
}

function updateGlossaryView() {
    const container = document.getElementById('glossaryList');
    
    if (glossaryTerms.length === 0) {
        container.innerHTML = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 20px;">📖</div><p>尚未新增任何專有名詞</p></div>';
        return;
    }

    const sortedTerms = [...glossaryTerms].sort((a, b) => a.term.localeCompare(b.term, 'zh-TW'));
    const groupedTerms = {};
    
    sortedTerms.forEach(term => {
        const category = term.category || '一般';
        if (!groupedTerms[category]) groupedTerms[category] = [];
        groupedTerms[category].push(term);
    });

    let html = '';
    Object.keys(groupedTerms).sort().forEach(category => {
        html += `<h3 style="margin: 30px 0 20px 0; color: #667eea; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">${escapeHtml(category)}</h3>`;
        
        groupedTerms[category].forEach(term => {
            const uniqueId = term.firebaseKey || term.id;
            const isNew = term.timestamp && (Date.now() - term.timestamp < 300000);
            const updateInfo = term.updatedAt ? `<br><small style="color: #28a745;">已更新：${term.updatedAt}</small>` : '';
            
            html += `
                <div class="question-item ${isNew ? 'new' : ''}">
                    <div class="question-header">
                        <div class="question-text" onclick="editGlossaryTerm('${term.firebaseKey || ''}', '${term.id}')" title="點擊編輯" style="color: #667eea; font-weight: bold;">
                            ${escapeHtml(term.term)}
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn" onclick="editGlossaryTerm('${term.firebaseKey || ''}', '${term.id}')" style="background: #17a2b8; padding: 8px 16px; font-size: 14px;">編輯</button>
                            <button class="btn-danger btn" onclick="deleteGlossaryTerm('${term.firebaseKey || ''}', '${term.id}')">刪除</button>
                        </div>
                    </div>
                    <div style="color: #6c757d; font-size: 14px; margin: 10px 0;">
                        建立者：${escapeHtml(term.author || '匿名用戶')} | 建立時間：${term.createdAt}${updateInfo}
                    </div>
                    <button class="show-answer-btn" id="defBtn-${uniqueId}" onclick="toggleDefinition('${uniqueId}')">顯示定義</button>
                    <div class="answer-text" id="definition-${uniqueId}">
                        <strong>定義：</strong><br>
                        ${escapeHtml(term.definition)}
                    </div>
                </div>
            `;
        });
    });
    
    container.innerHTML = html;
}

function updateExportView() {
    const container = document.getElementById('pdfPreview');
    
    if (questions.length === 0 && glossaryTerms.length === 0) {
        container.innerHTML = '<div class="empty-state"><div style="font-size: 48px; margin-bottom: 20px;">📄</div><p>尚未有任何內容可以輸出</p></div>';
        return;
    }

    let html = '<h3>預覽內容：</h3>';
    
    if (questions.length > 0) {
        html += `<h4 style="color: #667eea; margin: 20px 0 15px 0;">問題與答案</h4>`;
        questions.forEach((q, index) => {
            html += `
                <div class="question-item">
                    <div style="font-weight: bold; margin-bottom: 10px;">問題 ${index + 1}：${escapeHtml(q.question)}</div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px;">
                        <strong>答案：</strong>${escapeHtml(q.answer)}
                    </div>
                </div>
            `;
        });
    }

    if (glossaryTerms.length > 0) {
        html += `<h4 style="color: #667eea; margin: 30px 0 15px 0;">專有名詞</h4>`;
        glossaryTerms.forEach(term => {
            html += `
                <div class="question-item">
                    <div style="font-weight: bold; color: #667eea;">${escapeHtml(term.term)}</div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 10px;">
                        <strong>定義：</strong>${escapeHtml(term.definition)}
                    </div>
                </div>
            `;
        });
    }
    
    container.innerHTML = html;
}

function updateAllViews() {
    updateManageView();
    updateAnswerView();
    updateGlossaryView();
    updateExportView();
}

// PDF 輸出
function exportToPDF() {
    if (questions.length === 0 && glossaryTerms.length === 0) {
        alert('沒有內容可以輸出！');
        return;
    }

    const pdfBtn = document.getElementById('pdfBtn');
    if (pdfBtn) {
        pdfBtn.disabled = true;
        pdfBtn.textContent = '生成中...';
    }

    const tempContainer = document.createElement('div');
    tempContainer.style.cssText = 'position:absolute;top:-9999px;width:210mm;background:#fff;padding:30px;font-family:Microsoft YaHei,Arial;line-height:1.6;color:#333';
    
    tempContainer.innerHTML = generatePDFContent();
    document.body.appendChild(tempContainer);

    const opt = {
        margin: [15, 15, 15, 15],
        filename: `knowledge-base-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(tempContainer).save().then(() => {
        document.body.removeChild(tempContainer);
        if (pdfBtn) {
            pdfBtn.disabled = false;
            pdfBtn.textContent = '下載 PDF';
        }
    }).catch(() => {
        if (tempContainer.parentNode) document.body.removeChild(tempContainer);
        if (pdfBtn) {
            pdfBtn.disabled = false;
            pdfBtn.textContent = '下載 PDF';
        }
    });
}

function generatePDFContent() {
    let html = `
        <h1 style="text-align:center;color:#667eea;margin-bottom:30px">問題與專有名詞知識庫</h1>
        <div style="text-align:center;margin-bottom:30px;color:#6c757d;font-size:12px">生成時間：${new Date().toLocaleString()}</div>
    `;

    if (questions.length > 0) {
        html += `<h2 style="color:#495057;margin:30px 0 20px 0">問題與答案 (${questions.length} 項)</h2>`;
        questions.forEach((q, i) => {
            html += `
                <div style="margin-bottom:25px;padding:20px;border-left:4px solid #667eea;background:#f8f9fa">
                    <div style="font-weight:bold;margin-bottom:12px;color:#495057">問題 ${i + 1}：${escapeHtml(q.question)}</div>
                    <div style="margin:12px 0;padding-left:20px;background:white;padding:15px;border-radius:5px">
                        <strong style="color:#667eea">答案：</strong><br>${escapeHtml(q.answer)}
                    </div>
                    <div style="font-size:12px;color:#6c757d;margin-top:10px">發布者：${escapeHtml(q.author || '匿名用戶')} | ${q.createdAt}</div>
                </div>
            `;
        });
    }

    if (glossaryTerms.length > 0) {
        html += `<h2 style="color:#495057;margin:40px 0 20px 0">專有名詞解釋 (${glossaryTerms.length} 項)</h2>`;
        const groupedTerms = {};
        glossaryTerms.forEach(term => {
            const cat = term.category || '一般';
            if (!groupedTerms[cat]) groupedTerms[cat] = [];
            groupedTerms[cat].push(term);
        });

        Object.keys(groupedTerms).sort().forEach(category => {
            html += `<h3 style="color:#667eea;margin:25px 0 15px 0">${escapeHtml(category)}</h3>`;
            groupedTerms[category].forEach(term => {
                html += `
                    <div style="margin-bottom:20px;padding:15px 0;border-bottom:1px solid #e9ecef">
                        <div style="font-weight:bold;color:#667eea;font-size:16px;margin-bottom:8px">${escapeHtml(term.term)}</div>
                        <div style="margin:8px 0;padding-left:15px">${escapeHtml(term.definition)}</div>
                        <div style="font-size:11px;color:#6c757d;padding-left:15px">建立者：${escapeHtml(term.author || '匿名用戶')} | ${term.createdAt}</div>
                    </div>
                `;
            });
        });
    }

    return html;
}

// 工具函數
function updateConnectionStatus(message, isOnline) {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isOnline ? 'connection-status' : 'connection-status offline';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初始化
setTimeout(() => {
    if (questions.length === 0 && !firebaseEnabled) {
        fallbackToLocalStorage();
        setupNavigation();
        updateAllViews();
    }
}, 2000);