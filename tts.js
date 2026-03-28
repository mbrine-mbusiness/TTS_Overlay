        /////////////////////////////////
        ///
        /// COMFYJS FUNCTIONS BELOW
        ///
        //////////////////////////////////
        // Get the name of the file, use it as the streamer's name
        var path = window.location.pathname;
        var filename = path.split("/").pop();

        // Streamer name is always LOWERCASE
        const streamerName = filename.split(".")[0].toLowerCase();
        console.log(streamerName);

        // Init ComfyJS
        ComfyJS.Init(streamerName);

        // Chat message received event
        ComfyJS.onChat = (user, message, flags, self, extra) => {

            // Debug log
            console.log(user, extra);

            // Dollar sign is used for commands here
            if (message[0] == '$') {
                if (user == "mbrine" || user.toLowerCase() == streamerName) {

                    // Split the message byu its spaces
                    var comds = message.toLowerCase().split(' ');

                    // Ignore user with the given name
                    if (comds[0] == "$ignore" || comds[0] == "$ign") {
                        IgnoredUsers.push(comds[1].toLowerCase());
                        console.log(IgnoredUsers);
                    }
                    // Remove most recently ignored user
                    else if (comds[0] == "$cignore" || comds[0] == "$cign") {
                        IgnoredUsers.pop();
                        console.log(IgnoredUsers);
                    }
                    // Refresh the overlay
                    else if (comds[0] == "$refresh" || comds[0] == "$rf") {
                        location.reload();
                    }
                    // Debug all the voices
                    else if (comds[0] == "$debugvoices") {
                        var voices = getVoices();
                        for (let i = 0; i < voices.length; ++i) {
                            SaveMessage(user, "VOICE NUMBER: " + i + "! " + message.substring(comds[0].length), i, extra.messageEmotes);
                        }
                    }
                    // Toggle TTS on/off
                    else if (comds[0] == "$toggle") {
                        autoTTS = !autoTTS;
                        if (autoTTS)
                            TTSSay("Text To Speech enabled")
                        else
                            TTSSay("Text To Speech disabled")
                    }
                }
            }
            else {
                // Not command, not self, and TTS is enabled, save it
                if (!self && autoTTS) {
                    // Obtain a seed from user's chat color RGB values
                    var seed = 0;
                    if (extra.userColor != null) {
                        for (let char of extra.userColor) {
                            seed += hexToDecimal(char);
                        }
                    }

                    SaveMessage(user, message, seed, extra.messageEmotes);
                }
            }
        }

        // Banned users will get their message cut off, they are also ignored after
        ComfyJS.onBan = (bannedUsername, extra) => {
            if (currentmessage != null) {
                if (currentmessage.name == bannedUsername)
                    TTSSay("");
            }
            IgnoredUsers.push(bannedUsername);
        }
        // Timed out users will get their message cut off, they are also ignored after
        ComfyJS.onTimeout = (timedOutUsername, durationInSeconds, extra) => {
            if (currentmessage != null) {
                if (currentmessage.name == timedOutUsername)
                    TTSSay("");
            }
            IgnoredUsers.push(bannedUsername);
        }

        /////////////////////////////////
        ///
        /// TTS FUNCTIONS BELOW
        ///
        //////////////////////////////////

        // Store messages to be read out
        var previousmessages = [];

        // Limit of messages in the quese
        const messagelimit = 10;

        // Current message to read
        var currentmessage = null;

        // TTS Enabled
        var autoTTS = true;

        // TTS Utterance
        var msg = new SpeechSynthesisUtterance();

        // Username of last chatter
        var previousName = "";

        // This function
        msg.addEventListener("end", (event) => {
            if (autoTTS) {
                ReadbackFirstMessage();
            }
        });

        // Message object, contains the name, message and color seed
        function Message(name, message,language, seed = 0) {
            this.name = name;
            this.message = message;
            this.seed = seed;
            this.language = language
        }
        //Ignores emotes in chat messages
        function getMessageHTML(message, emotes) {
            var messageHTML = message;
            if (emotes) {

                // Store all emote keywords
                const stringReplacements = [];

                // Iterate of emotes to access ids and positions
                Object.entries(emotes).forEach(([id, positions]) => {
                    // Use only the first position to find out the emote key word
                    const position = positions[0];
                    const [start, end] = position.split("-");
                    const stringToReplace = message.substring(
                        parseInt(start, 10),
                        parseInt(end, 10) + 1
                    );

                    //Skip emotes that involve special characters
                    if (!/[\(\)\<\>\:\;]/gm.test(stringToReplace)) {

                        stringReplacements.push({
                            stringToReplace: stringToReplace,
                            replacement: ` `,
                        });
                    }
                });
                // Replace all emote keywords with nothing
                messageHTML = stringReplacements.reduce(
                    (acc, { stringToReplace, replacement }) => {
                        var re = new RegExp(`\\b(${stringToReplace})\\b`, "gs");
                        var r = acc.replace(re, replacement);
                        return r;
                    },
                    message
                );
            }
            // Link protection
            messageHTML = messageHTML.replace(/\b(?:https?:\/\/|www\.)[^\s]+/gm, " LINK ");

            // Replaces emoticon characters
            messageHTML = messageHTML.replace(/[\(\)\<\>\:\;]/gm, "");

            // Replace the triple-asterisk with "blocked link"
            messageHTML = messageHTML.replace(/\*\*\*/gm, " BLOCKED LINK ");

            // If the whole message is NOT in ALL CAPS, we lowercase the whole thing
            if(messageHTML.toUpperCase()!=messageHTML)
                messageHTML = messageHTML.toLowerCase();

            if(ReplaceWords.size >0)
            {
                // Perform message text replacement here
                for(let [word, replacement] of ReplaceWords)
                {
                    // Lowercase
                    var wordLC = word.toLowerCase();
                    var targetwordLC = replacement.toLowerCase();   
                    
                    // Uppercase
                    var wordUC = word.toUpperCase();
                    var targetwordUC = replacement.toUpperCase();             

                    // Sanity check, prevents an infinite loop if someone tries to replace a word with itself
                    if(wordLC == targetwordLC)
                        continue

                    if(AggressiveWordReplace)
                    {
                        // Bruteforce.exe
                        while(messageHTML.includes(wordLC))
                        {
                            messageHTML = messageHTML.replace(wordLC, targetwordLC)
                        }
                        while(messageHTML.includes(wordUC))
                        {
                            messageHTML = messageHTML.replace(wordUC, targetwordUC)
                        }
                    }
                    else
                    {
                        // Escape special regex characters in the word
                        var escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

                        // Create regex with word boundaries to replace whole words only
                        var regex = new RegExp('\\b' + escapedWord + '\\b', 'gi')

                        // Perform replacement globally with case-preserving logic
                        messageHTML = messageHTML.replace(regex, function(match) {
                            // Check if the matched word is all uppercase
                            if(match === match.toUpperCase() && match !== match.toLowerCase()) {
                                return targetwordUC;
                            }
                            // Check if the matched word starts with uppercase (capitalized)
                            else if(match[0] === match[0].toUpperCase() && match !== match.toUpperCase()) {
                                // Capitalize the first letter of the replacement
                                return targetwordLC.charAt(0).toUpperCase() + targetwordLC.slice(1);
                            }
                            // Otherwise, use lowercase replacement
                            else {
                                return targetwordLC;
                            }
                        })
                    }
                }                
            }
            return messageHTML;
        }

        async function detectLanguage(text) {
        if ('LanguageDetector' in window) {
            try {
            // Create a detector instance, optionally specifying expected languages
            const detector = await LanguageDetector.create({
                expectedInputLanguages: languages
            });

            // Detect the language(s)
            const results = await detector.detect(text);

            console.log(results);

            // The results array contains language codes and their confidence scores
            if (results && results.length > 0) {
                // Iterate through results to find the first matching expected language
                for(let res of results) {
                    console.log(`Language: ${res.detectedLanguage}, Confidence: ${res.confidence}`);
                    if(languages.includes(res.detectedLanguage)) {
                        return res.detectedLanguage;
                    }
                }
            }
            } catch (error) {
                console.error("Language detection error:", error);
                return "en"; // Fallback to English on error
            }
        } else {
            console.warn("LanguageDetector library not found.");
            return "en"; // Fallback to English if LanguageDetector is not available
        }
        return "en";
        }


        // Save a message to the queue
        async function SaveMessage(name, message, seed, emotes) {
            if (IgnoredUsers.includes(name.toLowerCase())) {
                console.log(name + " IGNORED");
                return;
            }

            // Remove emotes
            message = getMessageHTML(message, emotes);

            // If we have a nickname for them, we use that instead
            if(name.toLowerCase() in TTSNicknames){
                name = TTSNicknames[name.toLowerCase()];
            }

            // Push a new Message object to the queue
            var lang = await detectLanguage(message);
            previousmessages.push(new Message(name, message, lang, seed));


            // Remove the first message if over the limit
            if (previousmessages.length > messagelimit)
                previousmessages.splice(0, 1);

            // If TTS is not speaking (aka idle)
            if (!window.speechSynthesis.speaking) {
                ReadbackFirstMessage();
            }
        }

        // Read the first message in the queue
        function ReadbackFirstMessage() {
            // Sanity check
            if (previousmessages.length == 0)
                return;

            // Assign currentmessage and remove the first message in queue
            currentmessage = previousmessages[0];
            previousmessages.splice(0, 1);

            // Call RepeatReadback to read the current message out
            RepeatReadback();
        }
        function RepeatReadback() {
            // Sanity check
            if (currentmessage == null)
                return;

            // Skip reading if this user is ignored
            if (IgnoredUsers.includes(currentmessage.name.toLowerCase())) {
                return;
            }

            // Check if any characters defined in ReadableCharacters exist in the message
            // NOTE: ALL LOWERCASE
            var hasreadabletext = false;
            var lowercasemessage = currentmessage.message.toLowerCase();
            if(ReadableCharacters[currentmessage.language] == null) {
                hasreadabletext = true; // If no specific language defined, assume readable
            }
            else {
                for (let i = 0; i < ReadableCharacters[currentmessage.language].length; ++i) {
                    if (lowercasemessage.includes(ReadableCharacters[currentmessage.language][i])) {
                        hasreadabletext = true;
                        break;
                    }
                }
            }

            console.log(currentmessage);

            console.log("Has Readable Text: " + hasreadabletext);

            // No readable text? Don't read!
            if (!hasreadabletext)
                return;

            var msg = "";
            // If the same user sends multiple messages, skip reading their name
            if (currentmessage.name != previousName) {
                // Add a ... after the username to have a pause in the reading
                msg += currentmessage.name.toUpperCase() + " ... ";
            }

            // Append the message contents
            msg += currentmessage.message;

            //Assign the previous name
            previousName = currentmessage.name;
            // TTS Say
            TTSSay(msg,currentmessage.language, currentmessage.seed);
        }

        // Filters all text based on the arrays defined earlier
        function filterText(text) {
            var output = text;

            // Replace underscores with nothing
            while (output.includes("_"))
                output = output.replace('_', ' ');

            // Remove marked characters
            for (let i = 0; i < RemoveChars.length; ++i) {
                while (output.includes(RemoveChars[i])) {
                    // Replace with a space
                    output = output.replace(RemoveChars[i], ' ');
                }
            }

            // Add periods
            if(AddPeriodChars)
            {            
                for (let i = 0; i < AddPeriodChars.length; ++i) {
                    output = output.replaceAll(AddPeriodChars[i], '.' + AddPeriodChars[i] + '.');
                }
            } 
            if(AddSpaceChars)
            {            
                // Add spaces
                for (let i = 0; i < AddSpaceChars.length; ++i) {
                    output = output.replaceAll(AddSpaceChars[i], ' ' + AddSpaceChars[i]);
                }
            }

            return output;
        }
        // Force get voices
        var v = [];
        window.speechSynthesis.onvoiceschanged = () => {
            v = window.speechSynthesis.getVoices();
            console.log(v);
        };

        function getVoices(languageCode) {
            let voices = speechSynthesis.getVoices();

            // Filter for voices that match the language code
            var usablevoices = [];
            for (let v of voices) {
                // If no language code specified, add all voices
                if(languageCode === undefined || languageCode === null) {
                    usablevoices.push(v);
                }
                else if (v.lang.includes(languageCode)) {
                    usablevoices.push(v);
                }
            }

            return usablevoices;
        }

        // Read a text
        function TTSSay(text,language = "en", seed = 0) {
            // Filter the text
            msg.text = filterText(text);

            // Cancel any current TTS reading
            window.speechSynthesis.cancel();

            // Set the volume
            msg.volume = volume;

            // If the message is in all caps, we set the volume to be allCapsVolume
            if (msg.text.toUpperCase() == msg.text)
                msg.volume = allCapsVolume;

            // Acquire all voices on the machine
            var voices = getVoices(language);

            // Unpossible (unless you've uninstalled *every* voice)
            if (!voices.length) {
                console.log("NO VOICES!");
            }
            else {
                // Selected voice is the modulo of the seed with the number of voices
                var sel = seed % voices.length;
                msg.voice = voices[sel];
            }

            // SPEAK.
            window.speechSynthesis.speak(msg);
        }

        // Handly little hexadecimal to number converter
        function hexToDecimal(hex) {
            switch (hex) {
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                    return Number(hex);
                    break;
                case 'A':
                    return 10;
                    break;
                case 'B':
                    return 11;
                    break;
                case 'C':
                    return 12;
                    break;
                case 'D':
                    return 13;
                    break;
                case 'E':
                    return 14;
                    break;
                case 'F':
                    return 15;
                    break;
            }
            return 0;
        }
