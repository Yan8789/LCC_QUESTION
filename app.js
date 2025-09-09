// 全域變數
let questions = [];
let glossaryTerms = [];
let firebaseEnabled = false;
let questionsRef = null;
let glossaryRef = null;

// 初始化應用程式
window.initializeApp = function() {
    console.log('初始化應用程式...');
    setupNavigation();
    
    // 檢查 Firebase 是否可用
    if (typeof window.firebaseDb !== 'undefined') {
        try {
            questionsRef = window.firebaseRef(window.firebaseDb, 'questions');
            glossaryRef = window.firebaseRef(window.firebaseDb, 'glossary');
            setupFirebaseListener();
            setupGlossaryListener();
            firebaseEnabled = true;
            updateConnectionStatus('✅ 已連線到 Firebase 資料庫', true);
            console.log('Firebase 初始化成功');
        } catch (error) {
            console.error('Firebase 初始化失敗:', error);
            updateConnectionStatus('❌ Firebase 連線失敗：' + error.message, false);
            fallbackToLocalStorage();
        }
    } else {
        console.log('Firebase 模組未載入，使用本地模式');
        updateConnectionStatus('⚠️ 使用本地儲存模式（Firebase 未設定）', false);
        fallbackToLocalStorage();
    }
};

// 設定 Firebase 監聽器
function setupFirebaseListener() {
    window.firebaseOnValue(questionsRef, (snapshot) => {
        const data = snapshot.val();
        console.log('Firebase 資料更新:', data);
        
        if (data && typeof data === 'object') {
            questions = Object.keys(data).map(key => ({
                firebaseKey: key,
                ...data[key]
            }));
            console.log('載入的問題數量:', questions.length);
        } else {
            questions = [];
            console.log('資料庫為空，初始化空陣列');
        }
        
        updateAllViews();
    }, (error) => {
        console.error('Firebase 讀取錯誤:', error);
        updateConnectionStatus('連線錯誤，回退到本地模式', false);
        fallbackToLocalStorage();
    });
}

// 設定專有名詞 Firebase 監聽器
function setupGlossaryListener() {
    window.firebaseOnValue(glossaryRef, (snapshot) => {
        const data = snapshot.val();
        console.log('專有名詞 Firebase 資料更新:', data);
        
        if (data && typeof data === 'object') {
            glossaryTerms = Object.keys(data).map(key => ({
                firebaseKey: key,
                ...data[key]
            }));
            console.log('載入的專有名詞數量:', glossaryTerms.length);
        } else {
            glossaryTerms = [];
            console.log('專有名詞資料庫為空，初始化空陣列');
        }
        
        updateGlossaryView();
    }, (error) => {
        console.error('專有名詞 Firebase 讀取錯誤:', error);
    });
}

// 回退到本地儲存
function fallbackToLocalStorage() {
    updateConnectionStatus('使用本地儲存模式（其他人看不到您的問題）', false);
    loadQuestionsFromLocal();
    loadGlossaryFromLocal();
    updateAllViews();
}

// 更新連線狀態
function updateConnectionStatus(message, isOnline) {
    const statusEl = document.getElementById('connectionStatus');
    statusEl.textContent = message;
    statusEl.className = isOnline ? 'connection-status' : 'connection-status offline';
}

// 設定導航功能
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const sectionName = this.getAttribute('data-section');
            showSection(sectionName, this);
        });
    });
}

// 載入本地問題資料
function loadQuestionsFromLocal() {
    const saved = localStorage.getItem('questions');
    if (saved) {
        questions = JSON.parse(saved);
    }
}

// 載入本地專有名詞資料
function loadGlossaryFromLocal() {
    const saved = localStorage.getItem('glossaryTerms');
    if (saved) {
        glossaryTerms = JSON.parse(saved);
    }
}

// 儲存到本地
function saveQuestionsToLocal() {
    localStorage.setItem('questions', JSON.stringify(questions));
}

// 儲存專有名詞到本地
function saveGlossaryToLocal() {
    localStorage.setItem('glossaryTerms', JSON.stringify(glossaryTerms));
}

// 顯示指定區塊
function showSection(sectionName, clickedButton) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(sectionName).classList.add('active');
    clickedButton.classList.add('active');

    if (sectionName === 'manage') {
        updateManageView();
    } else if (sectionName === 'answer') {
        updateAnswerView();
    } else if (sectionName === 'glossary') {
        updateGlossaryView();
    } else if (sectionName === 'export') {
        updateExportView();
    }
}

// 切換新增表單顯示
function toggleAddForm() {
    const form = document.getElementById('addQuestionForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    
    if (form.style.display === 'block') {
        document.getElementById('questionInput').focus();
    }
}

// 切換新增專有名詞表單
function toggleGlossaryForm() {
    const form = document.getElementById('addGlossaryForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    
    if (form.style.display === 'block') {
        document.getElementById('termInput').focus();
    }
}

// 取消新增
function cancelAdd() {
    document.getElementById('addQuestionForm').style.display = 'none';
    document.getElementById('questionInput').value = '';
    document.getElementById('answerInput').value = '';
    document.getElementById('authorInput').value = '';
}

// 取消新增專有名詞
function cancelGlossaryAdd() {
    document.getElementById('addGlossaryForm').style.display = 'none';
    document.getElementById('termInput').value = '';
    document.getElementById('definitionInput').value = '';
    document.getElementById('categoryInput').value = '';
    document.getElementById('glossaryAuthorInput').value = '';
}

// 新增問題
function addQuestion() {
    const questionText = document.getElementById('questionInput').value.trim();
    const answerText = document.getElementById('answerInput').value.trim();
    const authorText = document.getElementById('authorInput').value.trim() || '匿名用戶';

    if (!questionText || !answerText) {
        alert('請填寫完整的問題和答案！');
        return;
    }

    const addBtn = document.getElementById('addBtn');
    addBtn.disabled = true;
    addBtn.textContent = '新增中...';

    const newQuestion = {
        id: Date.now(),
        question: questionText,
        answer: answerText,
        author: authorText,
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    if (firebaseEnabled && questionsRef) {
        // 儲存到 Firebase
        window.firebasePush(questionsRef, newQuestion).then(() => {
            cancelAdd();
            addBtn.disabled = false;
            addBtn.textContent = '新增';
        }).catch((error) => {
            console.error('新增失敗:', error);
            alert('新增失敗，請稍後再試');
            addBtn.disabled = false;
            addBtn.textContent = '新增';
        });
    } else {
        // 儲存到本地
        questions.push(newQuestion);
        saveQuestionsToLocal();
        updateAllViews();
        cancelAdd();
        addBtn.disabled = false;
        addBtn.textContent = '新增';
    }
}

// 新增專有名詞
function addGlossaryTerm() {
    const termText = document.getElementById('termInput').value.trim();
    const definitionText = document.getElementById('definitionInput').value.trim();
    const categoryText = document.getElementById('categoryInput').value.trim() || '一般';
    const authorText = document.getElementById('glossaryAuthorInput').value.trim() || '匿名用戶';

    if (!termText || !definitionText) {
        alert('請填寫完整的名詞和解釋！');
        return;
    }

    const addBtn = document.getElementById('addGlossaryBtn');
    addBtn.disabled = true;
    addBtn.textContent = '新增中...';

    const newTerm = {
        id: Date.now(),
        term: termText,
        definition: definitionText,
        category: categoryText,
        author: authorText,
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now()
    };

    if (firebaseEnabled && glossaryRef) {
        // 儲存到 Firebase
        window.firebasePush(glossaryRef, newTerm).then(() => {
            cancelGlossaryAdd();
            addBtn.disabled = false;
            addBtn.textContent = '新增';
        }).catch((error) => {
            console.error('新增專有名詞失敗:', error);
            alert('新增失敗，請稍後再試');
            addBtn.disabled = false;
            addBtn.textContent = '新增';
        });
    } else {
        // 儲存到本地
        glossaryTerms.push(newTerm);
        saveGlossaryToLocal();
        updateGlossaryView();
        cancelGlossaryAdd();
        addBtn.disabled = false;
        addBtn.textContent = '新增';
    }
}

// 刪除問題
function deleteQuestion(firebaseKey, localId) {
    if (!confirm('確定要刪除這個問題嗎？')) {
        return;
    }

    if (firebaseEnabled && questionsRef && firebaseKey) {
        // 從 Firebase 刪除
        const questionRef = window.firebaseRef(window.firebaseDb, `questions/${firebaseKey}`);
        window.firebaseRemove(questionRef).catch((error) => {
            console.error('刪除失敗:', error);
            alert('刪除失敗，請稍後再試');
        });
    } else {
        // 從本地刪除
        const numId = Number(localId);
        questions = questions.filter(q => Number(q.id) !== numId);
        saveQuestionsToLocal();
        updateAllViews();
    }
}

// 刪除專有名詞
function deleteGlossaryTerm(firebaseKey, localId) {
    if (!confirm('確定要刪除這個專有名詞嗎？')) {
        return;
    }

    if (firebaseEnabled && glossaryRef && firebaseKey) {
        // 從 Firebase 刪除
        const termRef = window.firebaseRef(window.firebaseDb, `glossary/${firebaseKey}`);
        window.firebaseRemove(termRef).catch((error) => {
            console.error('刪除專有名詞失敗:', error);
            alert('刪除失敗，請稍後再試');
        });
    } else {
        // 從本地刪除
        const numId = Number(localId);
        glossaryTerms = glossaryTerms.filter(t => Number(t.id) !== numId);
        saveGlossaryToLocal();
        updateGlossaryView();
    }
}

// 搜尋專有名詞
function filterGlossary() {
    const searchTerm = document.getElementById('glossarySearch').value.toLowerCase();
    const container = document.getElementById('glossaryList');
    const items = container.querySelectorAll('.question-item');
    
    items.forEach(item => {
        const termText = item.querySelector('.question-text').textContent.toLowerCase();
        const definitionText = item.querySelector('.answer-text') ? 
            item.querySelector('.answer-text').textContent.toLowerCase() : '';
        
        if (termText.includes(searchTerm) || definitionText.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// 顯示/隱藏答案
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

// 顯示/隱藏專有名詞定義
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

// 更新管理視圖
function updateManageView() {
    const container = document.getElementById('questionsList');
    
    if (questions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 20px;">📝</div>
                <p>尚未新增任何問題</p>
                <p style="font-size: 14px; margin-top: 10px;">點擊上方的「+ 新增問題」開始建立您的問題庫</p>
            </div>
        `;
        return;
    }

    // 按時間排序，最新的在前面
    const sortedQuestions = [...questions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    let html = '';
    sortedQuestions.forEach(q => {
        const isNew = q.timestamp && (Date.now() - q.timestamp < 300000); // 5分鐘內為新問題
        html += `
            <div class="question-item ${isNew ? 'new' : ''}">
                <div class="question-header">
                    <div class="question-text">${escapeHtml(q.question)}</div>
                    <button class="btn-danger btn" onclick="deleteQuestion('${q.firebaseKey || ''}', '${q.id}')">刪除</button>
                </div>
                <div style="color: #6c757d; font-size: 14px; margin-top: 10px;">
                    提問者：${escapeHtml(q.author || '匿名用戶')} | 建立時間：${q.createdAt}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 更新回答視圖
function updateAnswerView() {
    const container = document.getElementById('answerQuestionsList');
    
    if (questions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 20px;">❓</div>
                <p>尚未有任何問題</p>
                <p style="font-size: 14px; margin-top: 10px;">請先到「管理問題」區塊新增問題</p>
            </div>
        `;
        return;
    }

    // 按時間排序
    const sortedQuestions = [...questions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    let html = '';
    sortedQuestions.forEach(q => {
        const uniqueId = q.firebaseKey || q.id;
        html += `
            <div class="question-item">
                <div class="question-text">${escapeHtml(q.question)}</div>
                <div style="color: #6c757d; font-size: 14px; margin: 10px 0;">
                    提問者：${escapeHtml(q.author || '匿名用戶')}
                </div>
                <button class="show-answer-btn" id="btn-${uniqueId}" onclick="toggleAnswer('${uniqueId}')">顯示答案</button>
                <div class="answer-text" id="answer-${uniqueId}">
                    <strong>答案：</strong><br>
                    ${escapeHtml(q.answer)}
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// 更新專有名詞視圖
function updateGlossaryView() {
    const container = document.getElementById('glossaryList');
    
    if (glossaryTerms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 20px;">📖</div>
                <p>尚未新增任何專有名詞</p>
                <p style="font-size: 14px; margin-top: 10px;">點擊上方的「+ 新增名詞」開始建立您的專有名詞庫</p>
            </div>
        `;
        return;
    }

    // 按字母排序
    const sortedTerms = [...glossaryTerms].sort((a, b) => 
        a.term.localeCompare(b.term, 'zh-TW', { numeric: true })
    );

    let html = '';
    
    // 按分類分組
    const groupedTerms = {};
    sortedTerms.forEach(term => {
        const category = term.category || '一般';
        if (!groupedTerms[category]) {
            groupedTerms[category] = [];
        }
        groupedTerms[category].push(term);
    });

    // 依分類顯示
    Object.keys(groupedTerms).sort().forEach(category => {
        html += `<h3 style="margin: 30px 0 20px 0; color: #667eea; border-bottom: 2px solid #e9ecef; padding-bottom: 10px;">${escapeHtml(category)}</h3>`;
        
        groupedTerms[category].forEach(term => {
            const uniqueId = term.firebaseKey || term.id;
            const isNew = term.timestamp && (Date.now() - term.timestamp < 300000); // 5分鐘內為新名詞
            
            html += `
                <div class="question-item ${isNew ? 'new' : ''}">
                    <div class="question-header">
                        <div class="question-text" style="color: #667eea; font-weight: bold;">${escapeHtml(term.term)}</div>
                        <button class="btn-danger btn" onclick="deleteGlossaryTerm('${term.firebaseKey || ''}', '${term.id}')">刪除</button>
                    </div>
                    <div style="color: #6c757d; font-size: 14px; margin: 10px 0;">
                        建立者：${escapeHtml(term.author || '匿名用戶')}
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

// 更新輸出視圖
function updateExportView() {
    const container = document.getElementById('pdfPreview');
    
    if (questions.length === 0 && glossaryTerms.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                <p>尚未有任何內容可以輸出</p>
                <p style="font-size: 14px; margin-top: 10px;">請先新增問題或專有名詞後再進行 PDF 輸出</p>
            </div>
        `;
        return;
    }

    let html = '<h3 style="margin-bottom: 20px;">預覽內容：</h3>';
    
    // 顯示問題預覽
    if (questions.length > 0) {
        html += '<h4 style="color: #667eea; margin: 20px 0 15px 0;">問題與答案</h4>';
        const sortedQuestions = [...questions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        sortedQuestions.forEach((q, index) => {
            html += `
                <div class="question-item">
                    <div style="font-weight: bold; margin-bottom: 10px;">問題 ${index + 1}：${escapeHtml(q.question)}</div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                        <strong>答案：</strong>${escapeHtml(q.answer)}
                    </div>
                    <div style="color: #6c757d; font-size: 12px;">
                        提問者：${escapeHtml(q.author || '匿名用戶')} | ${q.createdAt}
                    </div>
                </div>
            `;
        });
    }

    // 顯示專有名詞預覽
    if (glossaryTerms.length > 0) {
        html += '<h4 style="color: #667eea; margin: 30px 0 15px 0;">專有名詞</h4>';
        const sortedTerms = [...glossaryTerms].sort((a, b) => 
            a.term.localeCompare(b.term, 'zh-TW', { numeric: true })
        );
        
        const groupedTerms = {};
        sortedTerms.forEach(term => {
            const category = term.category || '一般';
            if (!groupedTerms[category]) {
                groupedTerms[category] = [];
            }
            groupedTerms[category].push(term);
        });

        Object.keys(groupedTerms).sort().forEach(category => {
            html += `<h5 style="color: #495057; margin: 20px 0 10px 0;">${escapeHtml(category)}</h5>`;
            
            groupedTerms[category].forEach((term, index) => {
                html += `
                    <div class="question-item">
                        <div style="font-weight: bold; margin-bottom: 10px; color: #667eea;">${escapeHtml(term.term)}</div>
                        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 10px;">
                            <strong>定義：</strong>${escapeHtml(term.definition)}
                        </div>
                        <div style="color: #6c757d; font-size: 12px;">
                            建立者：${escapeHtml(term.author || '匿名用戶')} | ${term.createdAt}
                        </div>
                    </div>
                `;
            });
        });
    }
    
    container.innerHTML = html;
}

// 更新所有視圖
function updateAllViews() {
    updateManageView();
    updateAnswerView();
    updateGlossaryView();
    updateExportView();
}

// 輸出PDF
function exportToPDF() {
    if (questions.length === 0 && glossaryTerms.length === 0) {
        alert('沒有內容可以輸出！');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFont("helvetica", "normal");
    
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;

    // 標題
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text('Knowledge Base Collection', margin, yPosition);
    yPosition += 15;

    // 如果有問題，先輸出問題
    if (questions.length > 0) {
        yPosition += 10;
        doc.setFontSize(14);
        doc.text('Questions & Answers', margin, yPosition);
        yPosition += 15;

        const sortedQuestions = [...questions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");

        sortedQuestions.forEach((q, index) => {
            if (yPosition > pageHeight - 60) {
                doc.addPage();
                yPosition = 20;
            }

            // 問題編號和內容
            doc.setFont("helvetica", "bold");
            const questionText = `Q${index + 1}: ${q.question}`;
            const questionLines = doc.splitTextToSize(questionText, pageWidth - margin * 2);
            
            questionLines.forEach(line => {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(line, margin, yPosition);
                yPosition += 7;
            });

            // 答案
            yPosition += 5;
            doc.setFont("helvetica", "normal");
            const answerText = `A: ${q.answer}`;
            const answerLines = doc.splitTextToSize(answerText, pageWidth - margin * 2);
            
            answerLines.forEach(line => {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(line, margin, yPosition);
                yPosition += 7;
            });

            // 作者和時間
            yPosition += 3;
            doc.setFont("helvetica", "italic");
            doc.setFontSize(10);
            const metaText = `Author: ${q.author || 'Anonymous'} | ${q.createdAt}`;
            doc.text(metaText, margin, yPosition);
            yPosition += 15;
            doc.setFontSize(12);
        });
    }

    // 如果有專有名詞，輸出專有名詞
    if (glossaryTerms.length > 0) {
        if (questions.length > 0) {
            yPosition += 20;
        }
        
        if (yPosition > pageHeight - 100) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text('Glossary', margin, yPosition);
        yPosition += 15;

        const sortedTerms = [...glossaryTerms].sort((a, b) => 
            a.term.localeCompare(b.term, 'zh-TW', { numeric: true })
        );
        
        // 按分類分組
        const groupedTerms = {};
        sortedTerms.forEach(term => {
            const category = term.category || 'General';
            if (!groupedTerms[category]) {
                groupedTerms[category] = [];
            }
            groupedTerms[category].push(term);
        });

        doc.setFontSize(12);
        
        Object.keys(groupedTerms).sort().forEach(category => {
            if (yPosition > pageHeight - 40) {
                doc.addPage();
                yPosition = 20;
            }

            // 分類標題
            doc.setFont("helvetica", "bold");
            doc.text(category, margin, yPosition);
            yPosition += 12;

            groupedTerms[category].forEach(term => {
                if (yPosition > pageHeight - 40) {
                    doc.addPage();
                    yPosition = 20;
                }

                // 名詞
                doc.setFont("helvetica", "bold");
                const termLines = doc.splitTextToSize(term.term, pageWidth - margin * 2);
                termLines.forEach(line => {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += 7;
                });

                // 定義
                yPosition += 3;
                doc.setFont("helvetica", "normal");
                const definitionLines = doc.splitTextToSize(term.definition, pageWidth - margin * 2);
                definitionLines.forEach(line => {
                    if (yPosition > pageHeight - 20) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    doc.text(line, margin, yPosition);
                    yPosition += 7;
                });

                // 作者
                yPosition += 2;
                doc.setFont("helvetica", "italic");
                doc.setFontSize(10);
                const metaText = `Added by: ${term.author || 'Anonymous'}`;
                doc.text(metaText, margin, yPosition);
                yPosition += 12;
                doc.setFontSize(12);
            });

            yPosition += 10;
        });
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    doc.save(`knowledge-base-${timestamp}.pdf`);
}

// 測試 Firebase 連線
function testFirebaseConnection() {
    if (!firebaseEnabled) {
        alert('Firebase 尚未初始化，請檢查設定');
        return;
    }

    // 嘗試寫入測試資料
    const testData = {
        id: Date.now(),
        question: '🧪 測試問題 - 如果您看到這個問題表示連線成功！',
        answer: '這是一個測試答案，用來確認 Firebase 連線正常運作。',
        author: '系統測試',
        createdAt: new Date().toLocaleString(),
        timestamp: Date.now(),
        isTest: true
    };

    window.firebasePush(questionsRef, testData).then(() => {
        alert('✅ Firebase 連線測試成功！\n測試問題已新增，您可以稍後刪除它。');
        updateConnectionStatus('Firebase 連線測試成功！', true);
    }).catch((error) => {
        console.error('Firebase 測試失敗:', error);
        alert('❌ Firebase 連線測試失敗：\n' + error.message + '\n\n請檢查：\n1. 資料庫規則是否允許讀寫\n2. 網路連線是否正常\n3. Firebase 設定是否正確');
    });
}

// HTML 跳脫函數，防止 XSS 攻擊
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 如果 Firebase 模組載入失敗，回退到本地模式
window.addEventListener('error', function(e) {
    if (e.message && e.message.includes('firebase')) {
        console.warn('Firebase 載入失敗，使用本地模式');
        fallbackToLocalStorage();
    }
});

// 初始載入（如果 Firebase 沒有觸發）
setTimeout(() => {
    if (typeof window.initializeApp === 'function' && questions.length === 0 && !firebaseEnabled) {
        fallbackToLocalStorage();
        setupNavigation();
        updateAllViews();
    }
}, 2000);