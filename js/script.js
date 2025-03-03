// 輪播圖功能
let slideIndex = 1;

// AI 助手相關變量和函數
const API_KEY = "sk-alqridofcfmmtqiprikwetsyvhwulnxblfoxkmenodofdbhq"; // API 密鑰
const API_URL = "https://api.siliconflow.cn/v1/chat/completions"; // 修正為正確的 API 端點

// 頁面加載完成後自動顯示第一張圖片並啟動自動輪播
document.addEventListener('DOMContentLoaded', function() {
    showSlides(slideIndex);
    // 自動輪播，每 2 秒切換一次
    setInterval(function() {
        plusSlides(1);
    }, 2000);
});

// 控制輪播圖切換
function plusSlides(n) {
    showSlides(slideIndex += n);
}

// 指示點控制
function currentSlide(n) {
    showSlides(slideIndex = n);
}

// 顯示指定索引的幻燈片
function showSlides(n) {
    let i;
    let slides = document.getElementsByClassName("mySlides");
    let dots = document.getElementsByClassName("dot");
    
    // 處理索引超出範圍的情況
    if (n > slides.length) {slideIndex = 1}
    if (n < 1) {slideIndex = slides.length}
    
    // 隱藏所有幻燈片
    for (i = 0; i < slides.length; i++) {
        slides[i].style.display = "none";
    }
    
    // 移除所有指示點的活動狀態
    for (i = 0; i < dots.length; i++) {
        dots[i].className = dots[i].className.replace(" active-dot", "");
    }
    
    // 顯示當前幻燈片並激活對應的指示點
    slides[slideIndex-1].style.display = "block";
    dots[slideIndex-1].className += " active-dot";
}

// AI小助手功能
document.addEventListener('DOMContentLoaded', function() {
    // 獲取元素
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const questionButtons = document.querySelectorAll('.question-btn');
    
    // 如果在AI小助手頁面
    if (chatMessages && userInput && sendButton) {
        // 發送按鈕點擊事件
        sendButton.addEventListener('click', function() {
            sendMessage();
        });
        
        // 輸入框按Enter鍵發送
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
        
        // 預設問題按鈕點擊事件
        questionButtons.forEach(button => {
            button.addEventListener('click', function() {
                userInput.value = this.textContent;
                sendMessage();
            });
        });
    }
    
    // 發送消息函數
    async function sendMessage() {
        const message = userInput.value.trim();
        
        if (message === '') return;
        
        // 添加用戶消息到聊天界面
        addMessage(message, 'user');
        userInput.value = '';
        
        // 禁用輸入框和發送按鈕，防止重複發送
        userInput.disabled = true;
        sendButton.disabled = true;
        
        // 創建 AI 回覆的消息容器
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message assistant';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.innerHTML = `<img src="./img/teacher.jpeg" alt="AI小助手">`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.innerHTML = '<p>思考中...</p>';
        
        aiMessageDiv.appendChild(avatarDiv);
        aiMessageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(aiMessageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        try {
            // 調用AI API並處理流式回答
            await streamAI(message, contentDiv);
            
            // 滾動到最新消息
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } catch (error) {
            console.error("處理AI回答時出錯:", error);
            contentDiv.innerHTML = `<p>抱歉，處理您的請求時出現問題。請稍後再試。</p>`;
        } finally {
            // 重新啟用輸入框和發送按鈕
            userInput.disabled = false;
            sendButton.disabled = false;
            userInput.focus();
        }
    }
    
    // 流式調用 AI API
    async function streamAI(message, contentElement) {
        try {
            console.log("開始流式調用 AI API...");
            
            // 構建請求數據
            const requestData = {
                model: "deepseek-ai/DeepSeek-V3", // 使用正確的模型名稱
                messages: [
                    {
                        role: "system",
                        content: "你是一個專注於寵物與兒童教育的AI助手。你的任務是回答關於如何利用寵物教導孩子的問題，提供專業、友善且有教育意義的建議。請使用繁體中文回答，並使用純文字格式，不要使用任何 Markdown 標記（如 ###）。使用數字和字母來標示列表項目，使用空行來分隔段落。"
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 800,
                stream: true
            };
            
            console.log("請求數據:", JSON.stringify(requestData));
            
            try {
                // 設置請求超時
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時
                
                // 發送 API 請求
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify(requestData),
                    signal: controller.signal
                });
                
                // 清除超時計時器
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("API 錯誤響應:", errorText);
                    throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
                }
                
                // 處理流式回應
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let content = "";
                
                // 創建一個段落元素來顯示實時回應
                const responseParagraph = document.createElement('p');
                contentElement.innerHTML = '';
                contentElement.appendChild(responseParagraph);
                
                // 設置讀取超時
                let lastChunkTime = Date.now();
                const readTimeoutId = setInterval(() => {
                    const now = Date.now();
                    if (now - lastChunkTime > 5000) { // 5秒沒有新數據則視為超時
                        clearInterval(readTimeoutId);
                        reader.cancel("讀取超時");
                        throw new Error("讀取數據超時");
                    }
                }, 1000);
                
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            clearInterval(readTimeoutId);
                            break;
                        }
                        
                        lastChunkTime = Date.now(); // 更新最後接收數據的時間
                        
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.trim() === 'data: [DONE]') break;
                            
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonData = JSON.parse(line.substring(6));
                                    const chunkContent = jsonData.choices[0]?.delta?.content || '';
                                    if (chunkContent) {
                                        content += chunkContent;
                                        
                                        // 處理特殊格式
                                        let processedContent = content
                                            // 先轉義HTML特殊字符
                                            .replace(/&/g, '&amp;')
                                            .replace(/</g, '&lt;')
                                            .replace(/>/g, '&gt;')
                                            // 處理粗體文本 (**text**)
                                            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                                            // 處理斜體文本 (*text*)
                                            .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                                            // 處理換行
                                            .replace(/\n/g, '<br>');
                                        
                                        // 實時更新UI
                                        responseParagraph.innerHTML = processedContent;
                                        chatMessages.scrollTop = chatMessages.scrollHeight;
                                    }
                                } catch (e) {
                                    console.error("解析 JSON 數據時出錯:", e);
                                }
                            }
                        }
                    }
                } catch (readError) {
                    clearInterval(readTimeoutId);
                    console.error("讀取數據時出錯:", readError);
                    if (content) {
                        // 已經在UI上顯示了內容，不需要額外處理
                        return;
                    }
                    throw readError;
                }
                
                return content;
            } catch (apiError) {
                console.error("主要 API 調用失敗，嘗試使用備用 API (api2d):", apiError);
                
                // 嘗試使用 api2d 作為備用 API
                try {
                    console.log("開始調用備用 API (api2d)...");
                    
                    // 構建 api2d 請求數據
                    const api2dRequestData = {
                        model: "gpt-3.5-turbo", // 使用 o3 模型
                        messages: [
                            {
                                role: "system",
                                content: "你是一個專注於寵物與兒童教育的AI助手。你的任務是回答關於如何利用寵物教導孩子的問題，提供專業、友善且有教育意義的建議。請使用繁體中文回答，並使用純文字格式，不要使用任何 Markdown 標記（如 ###）。使用數字和字母來標示列表項目，使用空行來分隔段落。"
                            },
                            {
                                role: "user",
                                content: message
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 800
                    };
                    
                    // api2d 的 API 端點和密鑰
                    const API2D_URL = "https://openai.api2d.net/v1/chat/completions";
                    const API2D_KEY = "fk-xxxxxxxxxxxxxxxxxxxxxxxx"; // 請替換為實際的 API2D 密鑰
                    
                    // 設置請求超時
                    const api2dController = new AbortController();
                    const api2dTimeoutId = setTimeout(() => api2dController.abort(), 15000); // 15秒超時
                    
                    // 發送 api2d API 請求
                    const api2dResponse = await fetch(API2D_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${API2D_KEY}`
                        },
                        body: JSON.stringify(api2dRequestData),
                        signal: api2dController.signal
                    });
                    
                    // 清除超時計時器
                    clearTimeout(api2dTimeoutId);
                    
                    if (!api2dResponse.ok) {
                        const api2dErrorText = await api2dResponse.text();
                        console.error("備用 API 錯誤響應:", api2dErrorText);
                        throw new Error(`備用 API 請求失敗: ${api2dResponse.status} ${api2dResponse.statusText}`);
                    }
                    
                    // 處理 api2d 回應
                    const api2dData = await api2dResponse.json();
                    const api2dContent = api2dData.choices[0]?.message?.content || "";
                    
                    console.log("備用 API 調用成功");
                    
                    // 顯示回應在 UI 上
                    contentElement.innerHTML = `<p>${api2dContent}</p>`;
                    
                    return api2dContent;
                    
                } catch (api2dError) {
                    console.error("備用 API 調用也失敗，使用本地回覆:", api2dError);
                    
                    // 如果是超時錯誤，提供特定的錯誤消息
                    if (apiError.name === 'AbortError' || api2dError.name === 'AbortError') {
                        throw new Error("請求超時，請稍後再試");
                    }
                    
                    // 使用本地回覆
                    const localResponse = getLocalAIResponse(message, true);
                    contentElement.innerHTML = `<p>${localResponse}</p>`;
                    return localResponse;
                }
            }
        } catch (error) {
            console.error("AI API 調用過程中發生錯誤:", error);
            throw error;
        }
    }
    
    // 添加消息到聊天界面
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        let avatar, altText;
        if (sender === 'assistant') {
            avatar = './img/teacher.jpeg';
            altText = 'AI小助手';
        } else {
            avatar = './img/family.jpeg'; // 用戶頭像，請確保此圖片存在
            altText = '用戶';
        }
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'avatar';
        avatarDiv.innerHTML = `<img src="${avatar}" alt="${altText}">`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        if (sender === 'assistant') {
            // 處理AI回答的多段落文本
            const paragraphs = text.split('\n\n');
            let formattedHtml = '';
            
            paragraphs.forEach(paragraph => {
                if (paragraph.trim() !== '') {
                    // 處理特殊格式
                    let processedText = paragraph
                        // 先轉義HTML特殊字符
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        // 處理粗體文本 (**text**)
                        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                        // 處理斜體文本 (*text*)
                        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
                        // 處理換行
                        .replace(/\n/g, '<br>');
                    
                    formattedHtml += `<p>${processedText}</p>`;
                }
            });
            
            contentDiv.innerHTML = formattedHtml || `<p>${text}</p>`;
        } else {
            // 用戶消息保持簡單格式
            contentDiv.innerHTML = `<p style="white-space: normal; word-break: break-word;">${text}</p>`;
        }
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // 原來的callAI函數保留用於非流式場景
    async function callAI(message) {
        try {
            console.log("開始調用 AI API...");
            
            // 構建請求數據
            const requestData = {
                model: "deepseek-ai/DeepSeek-V3", // 使用正確的模型名稱
                messages: [
                    {
                        role: "system",
                        content: "你是一個專注於寵物與兒童教育的AI助手。你的任務是回答關於如何利用寵物教導孩子的問題，提供專業、友善且有教育意義的建議。請使用繁體中文回答，並使用純文字格式，不要使用任何 Markdown 標記（如 ###）。使用數字和字母來標示列表項目，使用空行來分隔段落。"
                    },
                    {
                        role: "user",
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 800,
                stream: true
            };
            
            console.log("請求數據:", JSON.stringify(requestData));
            
            try {
                // 設置請求超時
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時
                
                // 發送 API 請求
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify(requestData),
                    signal: controller.signal
                });
                
                // 清除超時計時器
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("API 錯誤響應:", errorText);
                    throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
                }
                
                // 處理流式回應
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let content = "";
                
                // 設置讀取超時
                let lastChunkTime = Date.now();
                const readTimeoutId = setInterval(() => {
                    const now = Date.now();
                    if (now - lastChunkTime > 5000) { // 5秒沒有新數據則視為超時
                        clearInterval(readTimeoutId);
                        reader.cancel("讀取超時");
                        throw new Error("讀取數據超時");
                    }
                }, 1000);
                
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            clearInterval(readTimeoutId);
                            break;
                        }
                        
                        lastChunkTime = Date.now(); // 更新最後接收數據的時間
                        
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        
                        for (const line of lines) {
                            if (line.trim() === '') continue;
                            if (line.trim() === 'data: [DONE]') break;
                            
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonData = JSON.parse(line.substring(6));
                                    const chunkContent = jsonData.choices[0]?.delta?.content || '';
                                    if (chunkContent) {
                                        content += chunkContent;
                                    }
                                } catch (e) {
                                    console.error("解析 JSON 數據時出錯:", e);
                                }
                            }
                        }
                    }
                } catch (readError) {
                    clearInterval(readTimeoutId);
                    console.error("讀取數據時出錯:", readError);
                    if (content) {
                        return content; // 返回已獲取的部分內容
                    }
                    throw readError;
                }
                
                return content || getLocalAIResponse(message);
            } catch (apiError) {
                console.error("主要 API 調用失敗，嘗試使用備用 API (api2d):", apiError);
                
                // 嘗試使用 api2d 作為備用 API
                try {
                    console.log("開始調用備用 API (api2d)...");
                    
                    // 構建 api2d 請求數據
                    const api2dRequestData = {
                        model: "gpt-3.5-turbo", // 使用 o3 模型
                        messages: [
                            {
                                role: "system",
                                content: "你是一個專注於寵物與兒童教育的AI助手。你的任務是回答關於如何利用寵物教導孩子的問題，提供專業、友善且有教育意義的建議。請使用繁體中文回答，並使用純文字格式，不要使用任何 Markdown 標記（如 ###）。使用數字和字母來標示列表項目，使用空行來分隔段落。"
                            },
                            {
                                role: "user",
                                content: message
                            }
                        ],
                        temperature: 0.7,
                        max_tokens: 800
                    };
                    
                    // api2d 的 API 端點和密鑰
                    const API2D_URL = "https://oa.api2d.net";
                    const API2D_KEY = "fk230956-rPFzZjnkv4f5G9LApSiqBainrfZD2bqB"; // 請替換為實際的 API2D 密鑰
                    
                    // 設置請求超時
                    const api2dController = new AbortController();
                    const api2dTimeoutId = setTimeout(() => api2dController.abort(), 15000); // 15秒超時
                    
                    // 發送 api2d API 請求
                    const api2dResponse = await fetch(API2D_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${API2D_KEY}`
                        },
                        body: JSON.stringify(api2dRequestData),
                        signal: api2dController.signal
                    });
                    
                    // 清除超時計時器
                    clearTimeout(api2dTimeoutId);
                    
                    if (!api2dResponse.ok) {
                        const api2dErrorText = await api2dResponse.text();
                        console.error("備用 API 錯誤響應:", api2dErrorText);
                        throw new Error(`備用 API 請求失敗: ${api2dResponse.status} ${api2dResponse.statusText}`);
                    }
                    
                    // 處理 api2d 回應
                    const api2dData = await api2dResponse.json();
                    const api2dContent = api2dData.choices[0]?.message?.content || "";
                    
                    console.log("備用 API 調用成功");
                    return api2dContent || getLocalAIResponse(message);
                    
                } catch (api2dError) {
                    console.error("備用 API 調用也失敗，使用本地回覆:", api2dError);
                    
                    // 如果是超時錯誤，提供特定的錯誤消息
                    if (apiError.name === 'AbortError' || api2dError.name === 'AbortError') {
                        throw new Error("請求超時，請稍後再試");
                    }
                    
                    return getLocalAIResponse(message, true);
                }
            }
        } catch (error) {
            console.error("AI API 調用過程中發生錯誤:", error);
            return getLocalAIResponse(message, true);
        }
    }
    
    // 本地回覆邏輯（當 API 調用失敗時使用）
    function getLocalAIResponse(message, isError = false) {
        console.log("使用本地回覆邏輯");
        
        // 如果是由於錯誤觸發的本地回覆，添加提示信息
        let errorPrefix = isError ? "抱歉，AI服務暫時無法連接。以下是我能提供的相關信息：\n\n" : "";
        
        // 預設回覆
        let defaultResponse = errorPrefix + "感謝您的提問！這是一個關於寵物與孩子學習的重要話題。根據教育心理學研究，寵物可以幫助孩子發展責任感、同理心和社交技能。您有更具體的問題嗎？";
        
        // 關鍵詞匹配 - 擴展更多主題
        const keywords = {
            '責任感': "培養孩子的責任感是養寵物的重要好處之一。您可以讓孩子參與餵食、清潔和日常照顧等任務，並逐漸增加他們的責任。從簡單的任務開始，如餵食，然後逐漸過渡到更複雜的照顧工作。重要的是要有耐心，並讚賞孩子的努力。",
            
            '同理心': "寵物能幫助孩子發展同理心，因為孩子需要理解和回應寵物的需求和情緒。鼓勵孩子觀察寵物的行為，思考寵物可能的感受，並相應地調整自己的行為。這種理解他人需求的能力會自然地延伸到與人的互動中。",
            
            '溝通': "與寵物互動可以提升孩子的溝通技能。雖然寵物不會說話，但孩子會學習解讀非語言線索，如身體語言和聲音。這種技能對於人際關係也非常重要。鼓勵孩子觀察寵物如何表達需求，並思考如何有效回應。",
            
            '社交': "寵物可以成為社交催化劑，幫助孩子建立友誼。帶寵物外出時，常常會吸引其他人的注意，為孩子創造社交機會。鼓勵孩子向他人介紹自己的寵物，這是練習社交技能的好方法。研究表明，擁有寵物的孩子通常在社交場合更自信。",
            
            '壓力': "研究表明，與寵物互動可以降低壓力荷爾蒙水平，幫助孩子在學習過程中保持放鬆。撫摸寵物可以釋放催產素，這種「幸福荷爾蒙」有助於減輕壓力和焦慮。建議在孩子學習或考試前後安排與寵物的互動時間。",
            
            '焦慮': "寵物可以成為孩子情感支持的重要來源，特別是在面對焦慮時。寵物提供無條件的愛和接納，這對於建立孩子的安全感非常重要。當孩子感到焦慮時，與寵物共度時光可以提供安慰和分散注意力。",
            
            '貓': "貓是相對獨立的寵物，可以幫助孩子學習尊重他人的邊界和獨立性。照顧貓需要細心和耐心，因為貓通常有自己的節奏和偏好。貓也是很好的情感支持動物，特別適合較安靜的家庭環境。選擇貓作為寵物時，考慮貓的年齡和性格是否與家庭環境匹配。",
            
            '狗': "狗通常需要更多的照顧和互動，可以教導孩子更多關於責任和常規的知識。狗的忠誠和熱情可以幫助孩子建立自信和安全感。不同品種的狗有不同的能量水平和需求，選擇時應考慮家庭生活方式和孩子的年齡。定期的訓練和社交化對狗的健康發展很重要。",
            
            '過敏': "如果孩子對寵物過敏，您可以考慮低過敏性的寵物品種，如某些品種的狗或貓。另外，保持家居清潔、定期為寵物洗澡、使用空氣淨化器等措施也可以減少過敏反應。在引入任何寵物前，建議先諮詢醫生的意見。某些替代寵物如魚類或爬蟲類可能是過敏兒童的好選擇。",
            
            '依賴': "處理孩子對寵物過度依賴的問題需要平衡。鼓勵孩子與寵物建立健康的關係，同時也要參與其他活動和社交互動。設定明確的界限，例如寵物不能進入某些區域或在特定時間不能打擾寵物。教導孩子尊重寵物的需求和空間，這也是一個重要的學習機會。",
            
            '學習': "寵物可以成為孩子學習的好夥伴。研究表明，向寵物朗讀可以提高孩子的閱讀自信和流暢度，因為寵物不會批評或糾正錯誤。您可以鼓勵孩子研究關於寵物的知識，如品種特點、行為和照顧方法，這可以培養研究技能和科學思維。",
            
            '情緒': "寵物可以幫助孩子學習情緒管理。當孩子感到沮喪或生氣時，與寵物互動可以幫助他們冷靜下來並調整情緒。寵物也提供了討論情緒的機會，如「看，小狗今天很開心」或「貓咪似乎有點害怕」，這有助於孩子識別和表達自己的情緒。",
            
            '安全': "教導孩子與寵物安全互動是非常重要的。這包括如何正確抱起和放下寵物、識別寵物不舒服的信號、以及何時給寵物空間。這些安全規則不僅保護孩子和寵物，還教導孩子尊重和邊界的概念。",
            
            '選擇': "選擇適合家庭的寵物需要考慮多方面因素，包括家庭生活方式、住房條件、時間承諾和經濟能力。建議全家一起討論並研究不同寵物的需求。考慮從收容所領養寵物，這不僅給予動物第二次機會，還能教導孩子關於救助和同情的價值。",
            
            '訓練': "參與寵物訓練可以教導孩子耐心、一致性和積極強化的價值。簡單的命令如「坐下」或「停留」可以由孩子在成人監督下教授。這種經驗幫助孩子理解清晰溝通的重要性，並建立成就感。",
            
            '失去': "不幸的是，寵物的壽命通常比人類短。當寵物生病或離世時，這可能是孩子第一次面對失去和悲傷。這提供了討論生命週期和處理悲傷的機會。允許孩子表達感受，並考慮舉行某種形式的告別儀式來紀念寵物。"
        };
        
        // 檢查消息中是否包含任何關鍵詞
        for (const [keyword, response] of Object.entries(keywords)) {
            if (message.toLowerCase().includes(keyword.toLowerCase())) {
                return errorPrefix + response;
            }
        }
        
        // 檢查是否是問候或感謝
        if (message.match(/你好|早安|午安|晚安|嗨|哈囉|謝謝|感謝/i)) {
            return errorPrefix + "您好！很高興能與您交流關於寵物與孩子教育的話題。我可以提供關於如何通過寵物培養孩子的責任感、同理心、社交技能等方面的建議。請告訴我您想了解什麼具體內容？";
        }
        
        // 檢查是否是關於系統或功能的問題
        if (message.match(/如何使用|功能|系統|怎麼用|幫助/i)) {
            return errorPrefix + "這是一個關於寵物與孩子教育的AI助手。您可以詢問關於如何通過寵物互動促進孩子發展的問題，例如培養責任感、同理心、社交技能等。只需在聊天框中輸入您的問題，我會盡力提供有用的建議和資訊。";
        }
        
        return defaultResponse;
    }
}); 