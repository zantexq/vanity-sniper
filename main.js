"use strict";
const tls = require("tls");
const WebSocket = require("ws");
const extractJsonFromString = require("extract-json-from-string");

const token = ""; //token
const s = ""; // sunucu id
const i = ""; // log gondercek kanal id

let vanity;
const guilds = {};

const tlsSocket = tls.connect({ host: "canary.discord.com", port: 443 });

tlsSocket.on("data", data => {
    const ext = extractJsonFromString(data.toString());
    const find = ext.find(e => e.code || e.message);
    if (find) {
        const requestBody = JSON.stringify({
            content: `@everyone ${vanity} \n\`\`\`json\n${JSON.stringify(find)}\`\`\``,
        });
        const request = [
            `POST /api/channels/${i}/messages HTTP/1.1`,
            "Host: canary.discord.com",
            `Authorization: ${token}`,
            "Content-Type: application/json",
            `Content-Length: ${Buffer.byteLength(requestBody)}`,
            "",
            requestBody,
        ].join("\r\n");

        tlsSocket.write(request);
    }
});

tlsSocket.on("error", () => process.exit());
tlsSocket.on("end", () => process.exit());

const sendPatchRequest = (guildId, code) => {
    const requestBody = JSON.stringify({ code });
    const request = [
        `PATCH /api/v7/guilds/${s}/vanity-url HTTP/1.1`,
        "Host: canary.discord.com",
        `Authorization: ${token}`,
        "Content-Type: application/json",
        `Content-Length: ${Buffer.byteLength(requestBody)}`,
        "",
        requestBody,
    ].join("\r\n");

    tlsSocket.write(request);
};

tlsSocket.on("secureConnect", () => {
    const websocket = new WebSocket("wss://gateway-us-east1-b.discord.gg");

    websocket.onclose = () => process.exit();

    websocket.onmessage = message => {
        const { d, op, t } = JSON.parse(message.data);

        if (t === "GUILD_UPDATE") {
            const find = guilds[d.guild_id];
            if (find && find !== d.vanity_url_code) {
                sendPatchRequest(s, find);
                vanity = `${find}`;
            }
        } else if (t === "GUILD_DELETE") {
            const find = guilds[d.id];
            if (find) {
                sendPatchRequest(s, find);
                vanity = `${find} guild delete `;
            }
        } else if (t === "READY") {
            d.guilds.forEach(guild => {
                guilds[guild.id] = guild.vanity_url_code;
            });
        }

        if (op === 10) {
            websocket.send(JSON.stringify({
                op: 2,
                d: {
                    token: l,
                    intents: 1,
                    properties: { os: "iOS", browser: "google", device: "" },
                },
            }));
            setInterval(() => websocket.send(JSON.stringify({ op: 1, d: {}, s: null, t: "heartbeat" })), d.heartbeat_interval);
        } else if (op === 7) {
            process.exit();
        }
    };

    setInterval(() => tlsSocket.write(["GET / HTTP/1.1", "Host: canary.discord.com", "", ""].join("\r\n")), 600);
});
