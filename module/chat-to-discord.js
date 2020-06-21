class ChatToDiscord {
	static renderChatMessage(chatMessage, html, messageData) {
        if (ChatToDiscord.DEBUG) {
            console.dir({"chatMessage": chatMessage});
        }
        
        // Only the client of the author should post to webhook and we ignore whispers
        if (!chatMessage.isAuthor || chatMessage.isWhisper) {
            return;
        }

        // Must be a smarter way to get this from game so it includes path prefix
        const gamehost = window.location.protocol + "//" + window.location.host + "/"
        const url = game.settings.get('chat-to-discord', 'webhook');
        const token = canvas.tokens.get(chatMessage.data.speaker.token);

        // Discord webhook expects a decimal color
        const rgb = /#?([\da-fA-F]{2})([\da-fA-F]{2})([\da-fA-F]{2})/.exec(chatMessage.user.color);
        const color = parseInt(rgb[1], 16) << 16 | parseInt(rgb[2], 16) << 8 | parseInt(rgb[3], 16);

        var type = chatMessage.data.type;

        // Theatre uses IC for Narrator, but token is undefined, so change to OOC
        if (theatre && chatMessage.alias === Theatre.NARRATOR) {
            type = CHAT_MESSAGE_TYPES.OOC;
        }

        switch (type) {
            case CHAT_MESSAGE_TYPES.ROLL:
                return;
                /* too many cases to investigate
                return ChatToDiscord.postToWebhook(url, {
                    "embeds": [{
                        "color": color,
                        "description": roll.result,
                        "title": [chatMessage.user.name, 'rolls', chatMessage.data.content, 
                                  'and gets', roll.total].join(' ')
                    }]
                });
                */

            case CHAT_MESSAGE_TYPES.OTHER:
                return; // as above

            case CHAT_MESSAGE_TYPES.OOC:
                return ChatToDiscord.postToWebhook(url, {
                    "embeds": [{
                        "title": chatMessage.alias,
                        "color": color,
                        "description": chatMessage.data.content
                    }]
                });

            // For emotes the actor alias is already in the message content
            case CHAT_MESSAGE_TYPES.EMOTE:
                return ChatToDiscord.postToWebhook(url, {
                    "embeds": [{
                        "title": '_' + chatMessage.data.content + '_'
                    }]
                });

            case CHAT_MESSAGE_TYPES.IC:
                return ChatToDiscord.postToWebhook(url, {
                    "embeds": [{
                        "title": chatMessage.alias,
                        "description": chatMessage.data.content,
                        "thumbnail": {
                            "url": gamehost + token.data.img
                        }
                    }]
                });

        }
    }

    static async postToWebhook(url, params) {
        var payload;
        try {
            payload = JSON.stringify(params);
        } catch(error) {
            console.log(error.message)
            return;
        }

        if (ChatToDiscord.DEBUG) {
            console.log(payload);
        }

        return new Promise((resolve, reject) => {
            try {
                let xhr = new XMLHttpRequest();
                xhr.open("POST", url);
                xhr.setRequestHeader("content-type", "application/json");
                xhr.onerror = () => reject(xhr.statusText);
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.response);
                    } else {
                        reject(xhr.statusText);
                    }
                };
                xhr.send(payload);
            } catch(error) {
                reject(error.message);
            }
        });
    }
}

Hooks.once('init', () => {
	game.settings.register('chat-to-discord', 'webhook', {
		name: 'Webhook URL',
		hint: 'The webhook to post to. Looks like https://discordapp.com/api/webhooks/1234567890/L0ts0fl3tt3r5andNum83r5',
		scope: 'world',
		config: true,
		type: String
	});
});

// Wait for ready event to hook renderChatMessage in order to only send new chat messages
Hooks.once('ready', () => {
    Hooks.on('renderChatMessage', ChatToDiscord.renderChatMessage);
});
