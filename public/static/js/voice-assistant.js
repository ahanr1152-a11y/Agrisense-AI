
/* =========================================================
   AgriSense - Voice Assistant
   Hindi speech recognition + Gemini AI adviser + speech
   ========================================================= */

(() => {
    "use strict";

    // ---------- AI adviser elements ----------
    const aiMic = document.getElementById("ai-mic");
    const aiMicLabel = document.getElementById("ai-mic-label");
    const aiVoiceStatus = document.getElementById("ai-voice-status");
    const aiQuestion = document.getElementById("ai-q");
    const aiGo = document.getElementById("ai-go");
    const aiOutput = document.getElementById("ai-out");
    const aiSpeak = document.getElementById("ai-say");
    const aiStopSpeech = document.getElementById("ai-stop-speech");

    // ---------- Existing general voice panel elements ----------
    const mic = document.getElementById("mic");
    const heard = document.getElementById("heard");
    const answer = document.getElementById("answer");
    const stop = document.getElementById("stop");
    const voiceMsg = document.getElementById("voice-msg");

    // ---------- Browser voice support ----------
    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    const speechSynthesisSupported =
        "speechSynthesis" in window;

    let aiRecognition = null;
    let aiIsListening = false;
    let aiRequestInProgress = false;
    let aiLastAnswer = "";

    let generalRecognition = null;
    let generalIsListening = false;

    // ---------- Safe text helper ----------
    function setText(element, text) {
        if (element) {
            element.textContent = text;
        }
    }

    // ---------- AI microphone UI ----------
    function setAiListeningUI(listening) {
        aiIsListening = listening;

        if (aiMicLabel) {
            aiMicLabel.textContent = listening
                ? "🔴 AI सुन रहा है…"
                : "🎤 बोलकर पूछें";
        }

        if (aiMic) {
            aiMic.classList.toggle("listening", listening);
            aiMic.setAttribute(
                "aria-pressed",
                String(listening)
            );
        }

        if (listening) {
            setText(
                aiVoiceStatus,
                "🎤 AI सुन रहा है… अब अपना सवाल बोलिए!"
            );
        }
    }

    function resetAiMic() {
        setAiListeningUI(false);
    }

    // ---------- Hindi text-to-speech ----------
    function speakHindi(text) {
        if (!speechSynthesisSupported || !text) {
            setText(
                aiVoiceStatus,
                "जवाब दिख रहा है, लेकिन इस ब्राउज़र में आवाज़ उपलब्ध नहीं है।"
            );
            return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "hi-IN";
        utterance.rate = 0.9;
        utterance.pitch = 1;

        utterance.onstart = () => {
            setText(aiVoiceStatus, "🔊 AI जवाब बोल रहा है…");
        };

        utterance.onend = () => {
            setText(aiVoiceStatus, "जवाब पूरा हुआ।");
        };

        utterance.onerror = (event) => {
            if (event.error !== "canceled" &&
                event.error !== "interrupted") {
                setText(
                    aiVoiceStatus,
                    "जवाब स्क्रीन पर उपलब्ध है; आवाज़ नहीं चल पाई।"
                );
            }
        };

        window.speechSynthesis.speak(utterance);
    }

    // ---------- Ask Gemini ----------
    async function askGemini(question) {
        if (aiRequestInProgress) {
            setText(
                aiVoiceStatus,
                "आपका पिछला सवाल अभी प्रोसेस हो रहा है।"
            );
            return;
        }

        aiRequestInProgress = true;

        if (aiGo) {
            aiGo.disabled = true;
        }

        setText(aiVoiceStatus, "🤖 AI आपका सवाल समझ रहा है…");

        if (aiOutput) {
            aiOutput.textContent = "कृपया प्रतीक्षा करें…";
        }

        try {
            const response = await fetch("/api/ai-advice", {
                method: "POST",
                credentials: "same-origin",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question.trim()
                })
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    "सर्वर से सही जवाब नहीं मिला।"
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error || "AI से जवाब नहीं मिला।"
                );
            }

            if (!data.advice || !data.advice.trim()) {
                throw new Error(
                    "AI ने खाली जवाब दिया। दोबारा कोशिश करें।"
                );
            }

            aiLastAnswer = data.advice.trim();

            if (aiOutput) {
                aiOutput.textContent = aiLastAnswer;
            }

            setText(
                aiVoiceStatus,
                data.demo
                    ? "उत्तर तैयार है। ध्यान दें: यह डेमो डेटा पर आधारित है।"
                    : "उत्तर तैयार है।"
            );

        } catch (error) {
            const message =
                error.message || "कुछ गड़बड़ हो गई।";

            if (aiOutput) {
                aiOutput.textContent = message;
            }

            setText(aiVoiceStatus, "⚠️ " + message);

        } finally {
            aiRequestInProgress = false;

            if (aiGo) {
                aiGo.disabled = false;
            }
        }
    }

    // ---------- Set up AI speech recognition ----------
    if (SpeechRecognition && aiMic) {
        aiRecognition = new SpeechRecognition();
        aiRecognition.lang = "hi-IN";
        aiRecognition.continuous = false;
        aiRecognition.interimResults = true;
        aiRecognition.maxAlternatives = 1;

        aiRecognition.onstart = () => {
            setAiListeningUI(true);
        };

        aiRecognition.onresult = (event) => {
            let finalTranscript = "";
            let interimTranscript = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                const text = event.results[i][0].transcript;

                if (event.results[i].isFinal) {
                    finalTranscript += text;
                } else {
                    interimTranscript += text;
                }
            }

            const transcript =
                (finalTranscript + interimTranscript).trim();

            if (aiQuestion && transcript) {
                aiQuestion.value = transcript;
                aiQuestion.dispatchEvent(
                    new Event("input", { bubbles: true })
                );
            }

            if (transcript) {
                setText(
                    aiVoiceStatus,
                    finalTranscript
                        ? "आपने कहा: " + finalTranscript
                        : "🎤 सुन रहा है: " + interimTranscript
                );
            }
        };

        aiRecognition.onerror = (event) => {
            let message = "माइक्रोफोन में समस्या आई।";

            if (event.error === "not-allowed" ||
                event.error === "service-not-allowed") {
                message =
                    "माइक्रोफोन की अनुमति दें और दोबारा कोशिश करें।";
            } else if (event.error === "no-speech") {
                message =
                    "आवाज़ नहीं मिली। माइक्रोफोन के पास बोलें।";
            } else if (event.error === "audio-capture") {
                message =
                    "माइक्रोफोन नहीं मिला। डिवाइस की जाँच करें।";
            } else if (event.error === "network") {
                message =
                    "वॉइस सेवा का नेटवर्क काम नहीं कर रहा।";
            }

            setText(aiVoiceStatus, "⚠️ " + message);
            resetAiMic();
        };

        aiRecognition.onend = () => {
            resetAiMic();
        };

        aiMic.addEventListener("click", () => {
            if (aiIsListening) {
                try {
                    aiRecognition.stop();
                } catch {
                    resetAiMic();
                }
                return;
            }

            // Immediate feedback while the browser starts listening.
            setText(
                aiVoiceStatus,
                "🎤 माइक्रोफोन शुरू हो रहा है…"
            );

            try {
                aiRecognition.start();
            } catch (error) {
                setText(
                    aiVoiceStatus,
                    "माइक्रोफोन शुरू नहीं हुआ। दोबारा कोशिश करें।"
                );
                resetAiMic();
            }
        });

    } else if (aiMic) {
        aiMic.addEventListener("click", () => {
            setText(
                aiVoiceStatus,
                "इस ब्राउज़र में वॉइस रिकग्निशन उपलब्ध नहीं है। Chrome में कोशिश करें।"
            );
        });
    }

    // ---------- Send the recognized/typed question ----------
    // This file owns the ai-go click handler.
    // Remove any duplicate ai-go handler from other JS files.
    if (aiGo) {
        aiGo.addEventListener("click", async (event) => {
            event.preventDefault();

            const question = aiQuestion
                ? aiQuestion.value.trim()
                : "";

            if (!question) {
                setText(
                    aiVoiceStatus,
                    "पहले सवाल बोलें या लिखें।"
                );

                if (aiQuestion) {
                    aiQuestion.focus();
                }
                return;
            }

            if (aiIsListening && aiRecognition) {
                try {
                    aiRecognition.stop();
                } catch {
                    resetAiMic();
                }
            }

            await askGemini(question);
        });
    }

    // ---------- Read AI answer aloud ----------
    if (aiSpeak) {
        aiSpeak.addEventListener("click", () => {
            const text = aiLastAnswer ||
                (aiOutput ? aiOutput.textContent.trim() : "");

            if (!text) {
                setText(
                    aiVoiceStatus,
                    "पहले AI से जवाब प्राप्त करें।"
                );
                return;
            }

            speakHindi(text);
        });
    }

    // ---------- Stop AI speech ----------
    if (aiStopSpeech) {
        aiStopSpeech.addEventListener("click", () => {
            if (speechSynthesisSupported) {
                window.speechSynthesis.cancel();
            }

            setText(aiVoiceStatus, "आवाज़ रोक दी गई।");
        });
    }

    // ---------- Existing general voice panel ----------
    // Kept separate from the AI adviser microphone.
    if (SpeechRecognition && mic) {
        generalRecognition = new SpeechRecognition();
        generalRecognition.lang = "hi-IN";
        generalRecognition.continuous = false;
        generalRecognition.interimResults = true;

        generalRecognition.onstart = () => {
            generalIsListening = true;
            setText(voiceMsg, "🎤 सुन रहा है…");
            mic.classList.add("listening");
        };

        generalRecognition.onresult = (event) => {
            let transcript = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
                i++
            ) {
                transcript += event.results[i][0].transcript;
            }

            setText(heard, transcript.trim());
        };

        generalRecognition.onerror = (event) => {
            setText(
                voiceMsg,
                "वॉइस समस्या: " + event.error
            );
        };

        generalRecognition.onend = () => {
            generalIsListening = false;

            if (mic) {
                mic.classList.remove("listening");
            }

            setText(voiceMsg, "वॉइस इनपुट बंद है।");
        };

        mic.addEventListener("click", () => {
            if (generalIsListening) {
                generalRecognition.stop();
                return;
            }

            try {
                generalRecognition.start();
            } catch {
                setText(
                    voiceMsg,
                    "माइक्रोफोन शुरू नहीं हुआ। फिर कोशिश करें।"
                );
            }
        });
    } else if (mic) {
        mic.addEventListener("click", () => {
            setText(
                voiceMsg,
                "इस ब्राउज़र में वॉइस रिकग्निशन उपलब्ध नहीं है।"
            );
        });
    }

    // Stop the separate general voice panel's speech if applicable.
    if (stop) {
        stop.addEventListener("click", () => {
            if (speechSynthesisSupported) {
                window.speechSynthesis.cancel();
            }

            setText(voiceMsg, "आवाज़ रोक दी गई।");
        });
    }

    // Optional: let the general voice panel read its answer aloud
    // when the existing answer element is clicked.
    if (answer) {
        answer.setAttribute("aria-live", "polite");
    }

})();
