const Discord = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config();



const _0x5653 = Buffer.from([0x56, 0x6f, 0x72, 0x6e, 0x73, 0x20, 0x53, 0x74, 0x75, 0x64, 0x69, 0x6f]).toString();

const CONFIG = {
    PREFIX: "e!",
    DELAY_MIN: 1200,
    DELAY_MAX: 3000,
    RETRY_ATTEMPTS: 5,
    SIMULATE_TYPING: true,
    TYPING_MIN: 600,
    TYPING_MAX: 1800,
    WORKER_RESTART_INTERVAL: 3600000,
    RATE_LIMIT_BUFFER: 1000,
    WORKER_RECOVERY_DELAY: 5000,
    MAX_CONSECUTIVE_FAILS: 10,
    UPDATE_INTERVAL: 3
};

const VISUALS = {
    PANEL_COLOR: "#5865F2",
    SUCCESS_COLOR: "#57F287",
    ERROR_COLOR: "#ED4245",
    WARN_COLOR: "#FEE75C",
    GIFS: {
        DASHBOARD: "https:
        BROADCAST: "https:
        CHECK: "https:
        COMPLETE: "https:
        ERROR: "https:
    }
};


const MAIN_BOT_TOKEN = process.env.DISCORD_TOKEN;



const OWNER_ID = "ضع_ايدي_هنا";


let logChannelId = null;


const LOG_EVENTS = {
    COMMAND: { emoji: "⌨️", label: "أمر نُفِّذ", color: "#5865F2" },
    TOKEN_ADD: { emoji: "➕", label: "توكن أُضيف", color: "#57F287" },
    TOKEN_DEL: { emoji: "🗑️", label: "توكن حُذف", color: "#ED4245" },
    BROADCAST: { emoji: "📢", label: "بث جماعي بدأ", color: "#FEE75C" },
    BROADCAST_END: { emoji: "✅", label: "بث اكتمل", color: "#57F287" },
    STATUS: { emoji: "🔄", label: "تغيير حالة بوت", color: "#EB459E" },
    BANNED: { emoji: "🚫", label: "بوت محظور", color: "#ED4245" },
    RATELIMIT: { emoji: "⏳", label: "Rate Limit", color: "#FEE75C" },
    REFRESH: { emoji: "🔃", label: "تجديد النظام", color: "#5865F2" },
    KICK: { emoji: "🚪", label: "طرد بوتات", color: "#ED4245" },
    ERROR: { emoji: "❌", label: "خطأ", color: "#ED4245" },
    IDENTITY: { emoji: "👤", label: "تغيير هوية", color: "#EB459E" },
    LOGIN: { emoji: "🟢", label: "تسجيل دخول", color: "#57F287" },
};


async function sendLog(eventType, description, extraFields = []) {
    if (!logChannelId) return;
    try {
        const channel = await client.channels.fetch(logChannelId).catch(() => null);
        if (!channel) return;
        const ev = LOG_EVENTS[eventType] || LOG_EVENTS.COMMAND;
        const embed = new Discord.EmbedBuilder()
            .setColor(ev.color)
            .setTitle(`${ev.emoji}  ${ev.label}`)
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: `نظام السجلات التلقائي | ${_0x5653}`, iconURL: client.user?.displayAvatarURL() });
        if (extraFields.length > 0) embed.addFields(extraFields);
        await channel.send({ embeds: [embed] });
    } catch { }
}


function isOwner(userId) {
    return userId === OWNER_ID;
}

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.GuildPresences
    ]
});


const LOG_STYLES = {
    INFO: "\x1b[1m\x1b[36m[معلومات]\x1b[0m",
    SUCCESS: "\x1b[1m\x1b[32m[نجاح]\x1b[0m",
    WARNING: "\x1b[1m\x1b[33m[تحذير]\x1b[0m",
    ERROR: "\x1b[1m\x1b[31m[خطأ]\x1b[0m",
    SYSTEM: "\x1b[1m\x1b[35m[النظام]\x1b[0m",
    BROADCAST: "\x1b[1m\x1b[34m[البث]\x1b[0m"
};

function customLog(type, message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\x1b[90m[${timestamp}]\x1b[0m ${LOG_STYLES[type] || type} ${message}`);
}

function printConsoleHeader() {
    console.clear();
    console.log("\x1b[36m\x1b[1m");
    console.log("------------------------------------------------------------------");
    console.log(`             BROADCAST SYSTEM - BY ${_0x5653.toUpperCase()}              `);
    console.log("------------------------------------------------------------------");
    console.log("\x1b[0m");
    console.log("\x1b[1m\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n");
}


const DATA_FILE = path.join(__dirname, "workers.json");

const defaultData = {
    workers: [],
    stats: { totalSent: 0, totalFailed: 0, lastBroadcast: null }
};

async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, "utf8");
        return JSON.parse(data);
    } catch {
        await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
        return { ...defaultData };
    }
}

async function writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}


function parseSpintax(text) {
    const regex = /\{([^{}]+)\}/g;
    let newText = text;
    while (regex.test(newText)) {
        newText = newText.replace(regex, (match, options) => {
            const choices = options.split('|');
            return choices[Math.floor(Math.random() * choices.length)];
        });
    }
    return newText;
}

function formatMessage(text, user) {
    let msg = text;
    msg = msg.replace(/{user}/g, `<@${user.id}>`);
    msg = msg.replace(/{username}/g, user.username);
    return parseSpintax(msg);
}


class WorkerBot {
    constructor(token) {
        this.token = token;
        this.client = null;
        this.status = "offline";
        this.userInfo = null;
        this.presenceInterval = null;
    }

    async start() {
        try {
            this.client = new Discord.Client({
                intents: [
                    Discord.GatewayIntentBits.Guilds,
                    Discord.GatewayIntentBits.DirectMessages,
                    Discord.GatewayIntentBits.GuildMembers
                ]
            });

            this.client.on("ready", () => {
                this.userInfo = this.client.user;
                this.status = "online";
                customLog("SUCCESS", `تم تشغيل البوت المساعد بنجاح: ${this.client.user.tag}`);
                this.rotatePresence();
                this.presenceInterval = setInterval(() => this.rotatePresence(), 600000);
            });

            await this.client.login(this.token);
            return true;
        } catch (error) {
            customLog("ERROR", `فشل تشغيل التوكن المساعد ${this.token.substring(0, 15)}... : ${error.message}`);
            this.status = "error";
            return false;
        }
    }

    async rotatePresence() {
        if (!this.client || this.status !== "online") return;
        const activities = [
            { name: "Minecraft", type: Discord.ActivityType.Playing },
            { name: "Valorant", type: Discord.ActivityType.Playing },
            { name: "Spotify", type: Discord.ActivityType.Listening },
            { name: "Discord", type: Discord.ActivityType.Watching },
            { name: "YouTube", type: Discord.ActivityType.Watching },
            { name: "Visual Studio Code", type: Discord.ActivityType.Playing }
        ];
        const statuses = ["online", "idle", "dnd"];
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        try {
            this.client.user.setPresence({
                activities: [randomActivity],
                status: randomStatus
            });
        } catch { }
    }

    async sendMessageWithRetry(userId, rawContent) {
        if (!this.client || this.status !== "online") return "offline";

        for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
            try {

                if (this.status === "rate_limited") {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    if (this.status !== "online") return "offline";
                }

                const user = await this.client.users.fetch(userId);
                const formattedContent = formatMessage(rawContent, user);
                const dmChannel = await user.createDM();

                if (CONFIG.SIMULATE_TYPING) {
                    await dmChannel.sendTyping().catch(() => { });
                    const typingDelay = Math.floor(Math.random() * (CONFIG.TYPING_MAX - CONFIG.TYPING_MIN + 1) + CONFIG.TYPING_MIN);
                    await new Promise(resolve => setTimeout(resolve, typingDelay));
                }

                await dmChannel.send(formattedContent);
                return true;

            } catch (error) {
                const errCode = error.code || error.status;
                customLog("WARNING", `محاولة ${attempt}/${CONFIG.RETRY_ATTEMPTS} | العضو: ${userId} | البوت: ${this.client?.user?.tag || "؟"} | الخطأ: ${error.message}`);


                if (error.status === 429 || errCode === 429) {
                    const retryAfter = (error.retryAfter || 5) * 1000 + CONFIG.RATE_LIMIT_BUFFER;
                    customLog("WARNING", `⏳ Rate Limit على ${this.client?.user?.tag}! انتظار ${retryAfter}ms`);
                    this.status = "rate_limited";
                    await new Promise(resolve => setTimeout(resolve, retryAfter));
                    this.status = "online";
                    attempt--;
                    continue;
                }


                if (errCode === 50007) return "dms_closed";


                if (errCode === 50013 || errCode === 50001 || errCode === 40003) return "dms_closed";


                if (error.status === 401 || errCode === 40004 || errCode === 0) {
                    this.status = "banned";
                    this.stop();
                    return "banned";
                }


                if (attempt < CONFIG.RETRY_ATTEMPTS) {
                    const backoff = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    await new Promise(resolve => setTimeout(resolve, backoff));
                }
            }
        }
        return false;
    }

    async checkStatus() {
        if (!this.client) return false;
        try {
            await this.client.user.fetch();
            return true;
        } catch {
            return false;
        }
    }

    async setAvatar(imageUrl) {
        if (!this.client) return false;
        try {
            const response = await fetch(imageUrl);
            const buffer = await response.arrayBuffer();
            await this.client.user.setAvatar(Buffer.from(buffer));
            return true;
        } catch (error) {
            customLog("ERROR", `فشل تغيير الرمز التعبيري: ${error.message}`);
            return false;
        }
    }

    async setUsername(newUsername) {
        if (!this.client) return false;
        try {
            await this.client.user.setUsername(newUsername);
            return true;
        } catch (error) {
            customLog("ERROR", `فشل تغيير الاسم: ${error.message}`);
            return false;
        }
    }

    async kickFromServer(guildId) {
        if (!this.client) return false;
        try {
            const guild = await this.client.guilds.fetch(guildId);
            await guild.leave();
            return true;
        } catch (error) {
            customLog("ERROR", `فشل مغادرة السيرفر: ${error.message}`);
            return false;
        }
    }

    stop() {
        if (this.presenceInterval) {
            clearInterval(this.presenceInterval);
            this.presenceInterval = null;
        }
        if (this.client) {
            try {
                this.client.destroy();
            } catch { }
        }
        this.status = "offline";
    }
}

const activeWorkers = new Map();

async function initWorkers() {
    const data = await readData();
    for (const worker of data.workers) {
        const botInstance = new WorkerBot(worker.token);
        const success = await botInstance.start();
        if (success) {
            activeWorkers.set(worker.token, botInstance);
            worker.status = "online";
            worker.name = botInstance.client.user?.tag;
        } else {
            worker.status = "error";
        }
    }
    await writeData(data);
}


async function checkAllTokens() {
    const data = await readData();
    let valid = 0, invalid = 0, banned = 0;

    for (const worker of data.workers) {
        const botInstance = activeWorkers.get(worker.token);
        if (botInstance) {
            const isOnline = await botInstance.checkStatus();
            if (isOnline) {
                valid++;
                worker.status = "online";
            } else {
                invalid++;
                worker.status = "error";
            }
        } else {
            const testClient = new Discord.Client({ intents: [] });
            try {
                await testClient.login(worker.token);
                testClient.destroy();
                valid++;
                worker.status = "online";
            } catch (error) {
                if (error.message.includes("401")) {
                    invalid++;
                    worker.status = "error";
                } else if (error.message.includes("429")) {
                    banned++;
                    worker.status = "banned";
                } else {
                    invalid++;
                    worker.status = "error";
                }
            }
        }
    }

    await writeData(data);
    return { valid, invalid, banned, total: data.workers.length };
}


async function refreshSystem() {
    for (const [token, worker] of activeWorkers) {
        if (worker.status !== "online") {
            worker.stop();
            activeWorkers.delete(token);
        }
    }

    const data = await readData();
    const validWorkers = [];

    for (const worker of data.workers) {
        if (worker.status === "online") {
            validWorkers.push(worker);
        } else {
            const botInstance = new WorkerBot(worker.token);
            const success = await botInstance.start();
            if (success) {
                activeWorkers.set(worker.token, botInstance);
                worker.status = "online";
                validWorkers.push(worker);
            }
        }
    }

    data.workers = validWorkers;
    await writeData(data);

    return { refreshed: validWorkers.length, removed: data.workers.length - validWorkers.length };
}


async function getAllMembers(guild) {
    try {
        const members = await guild.members.fetch();
        return members.filter(m => !m.user.bot).map(m => m.id);
    } catch (error) {
        customLog("ERROR", `فشل جلب الأعضاء: ${error.message}`);
        return [];
    }
}

async function getOnlineMembers(guild) {
    try {
        const members = await guild.members.fetch();
        const online = members.filter(m => {
            if (m.user.bot) return false;
            const status = m.presence?.status;
            return status === "online" || status === "idle" || status === "dnd";
        });
        return online.map(m => m.id);
    } catch (error) {
        customLog("ERROR", `فشل جلب الأعضاء المتصلين: ${error.message}`);
        return [];
    }
}


function generateProgressBar(current, total, barSize = 15) {
    const progress = total === 0 ? 0 : current / total;
    const filledLength = Math.round(barSize * progress);
    const emptyLength = barSize - filledLength;

    const filledBar = "█".repeat(filledLength);
    const emptyBar = "░".repeat(emptyLength);
    const percentage = (progress * 100).toFixed(1);

    return `\`[${filledBar}${emptyBar}]\` **${percentage}%**`;
}

function createPremiumEmbed({ title, description, color = VISUALS.PANEL_COLOR, thumbnail = null, image = null, fields = [] }) {
    const embed = new Discord.EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: `نظام البث الذكي | ${_0x5653}`, iconURL: client.user?.displayAvatarURL() });

    if (thumbnail) embed.setThumbnail(thumbnail);
    if (image) embed.setImage(image);
    if (fields && fields.length > 0) embed.addFields(fields);

    return embed;
}

function createMainPanelEmbed(data) {
    const onlineCount = data.workers.filter(w => w.status === "online").length;
    const rateLimitCount = data.workers.filter(w => w.status === "rate_limited").length;
    const totalSent = data.stats.totalSent || 0;
    const totalFailed = data.stats.totalFailed || 0;
    const total = totalSent + totalFailed;
    const successRate = total === 0 ? "0.0" : ((totalSent / total) * 100).toFixed(1);

    const description =
        `👋 **مرحباً بك في لوحة تحكم نظام البث!**\n` +
        `يمكنك إرسال رسائل البث بشكل جماعي باستخدام حسابات متعددة بالتناوب.\n\n` +
        `🛡️ **الحماية النشطة (Anti-Ban):**\n` +
        `• نظام طابور ديناميكي ذكي مشترك.\n` +
        `• محاكاة كتابة حقيقية قبل الإرسال (` + (CONFIG.SIMULATE_TYPING ? "مفعلة" : "معطلة") + `).\n` +
        `• دعم Spintax كامل لتنويع النصوص تلقائياً.\n` +
        `• تخطي تلقائي وحماية من الـ Rate Limits 429.`;

    const fields = [
        { name: "🤖 البوتات المسجلة", value: `\`${data.workers.length}\` بوتات`, inline: true },
        { name: "🟢 البوتات النشطة", value: `\`${onlineCount}\` متصلة`, inline: true },
        { name: "⏳ في حالة الانتظار", value: `\`${rateLimitCount}\` مقيدة`, inline: true },
        { name: "📨 الرسائل المرسلة", value: `\`${totalSent}\` نجاح`, inline: true },
        { name: "❌ رسائل فشلت", value: `\`${totalFailed}\` فشل`, inline: true },
        { name: "📈 نسبة النجاح", value: `\`${successRate}%\``, inline: true }
    ];

    return createPremiumEmbed({
        title: "✨ لوحة التحكم الرئيسية",
        description: description,
        color: VISUALS.PANEL_COLOR,
        image: VISUALS.GIFS.DASHBOARD,
        fields: fields
    });
}

function createMainPanelContainer() {
    const row1 = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder()
            .setCustomId("add_token")
            .setLabel("➕ إضافة توكن")
            .setStyle(Discord.ButtonStyle.Success),
        new Discord.ButtonBuilder()
            .setCustomId("remove_token")
            .setLabel("🗑️ إزالة توكن")
            .setStyle(Discord.ButtonStyle.Danger)
    );
    const row2 = new Discord.ActionRowBuilder().addComponents(
        new Discord.ButtonBuilder()
            .setCustomId("dm_tokens")
            .setLabel("📬 إرسال التوكنات (خاص)")
            .setStyle(Discord.ButtonStyle.Primary),
        new Discord.ButtonBuilder()
            .setCustomId("kick_bots")
            .setLabel("🚪 طرد البوتات المساعدين")
            .setStyle(Discord.ButtonStyle.Secondary)
    );
    return [row1, row2];
}


function createBroadcastEmbed(mode, total, workers, current, success, failed, dmsClosed, workerStatsArray) {
    const isComplete = current === total && total > 0;
    const progressBar = generateProgressBar(current, total, 16);

    let description =
        `🎯 **نوع البث:** ${mode === "all" ? "جميع الأعضاء" : "المتصلين فقط"}\n` +
        `🤖 **البوتات المشاركة:** \`${workers}\` بوتات نشطة\n\n` +
        `📊 **شريط التقدم:** ${progressBar} (${current}/${total})\n` +
        `✅ **تم الإرسال:** \`${success}\` | ❌ **الفشل:** \`${failed}\` (🔒 خاص مغلق: \`${dmsClosed}\`)\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚡ **سجل توزيع الإرسال التناوبي:**\n`;

    for (const ws of workerStatsArray) {
        description += `• **${ws.name}:** أرسل لـ \`${ws.count}\` عضو (✅ \`${ws.success}\` | ❌ \`${ws.failed}\`)\n`;
    }

    return createPremiumEmbed({
        title: isComplete ? "🎉 تم اكتمال البث بنجاح" : "⚡ البث قيد التنفيذ حالياً",
        description: description,
        color: isComplete ? VISUALS.SUCCESS_COLOR : VISUALS.PANEL_COLOR,
        image: isComplete ? VISUALS.GIFS.COMPLETE : VISUALS.GIFS.BROADCAST
    });
}

async function parallelBroadcast(userIds, messageText, statusMsg, mode) {
    const data = await readData();
    const onlineWorkers = [];

    for (const worker of data.workers) {
        if (worker.status === "online" && activeWorkers.has(worker.token)) {
            const instance = activeWorkers.get(worker.token);
            if (instance && instance.status === "online") {
                onlineWorkers.push({
                    token: worker.token,
                    name: worker.name,
                    instance: instance
                });
            }
        }
    }

    if (onlineWorkers.length === 0) {
        const errorEmbed = createPremiumEmbed({
            title: "❌ فشل بدء البث",
            description: "لم يتم العثور على أي بوتات مساعدة نشطة للقيام بالإرسال. يرجى إضافة توكن مساعد أولاً.",
            color: VISUALS.ERROR_COLOR,
            image: VISUALS.GIFS.ERROR
        });
        await statusMsg.edit({ embeds: [errorEmbed], components: [] }).catch(() => { });
        return { success: 0, failed: userIds.length, dmsClosed: 0 };
    }


    const queue = [...userIds];
    const totalUsers = userIds.length;

    let totalSuccess = 0;
    let totalFailed = 0;
    let totalDMsClosed = 0;
    let totalSent = 0;
    let lastUpdateTime = Date.now();

    const workerStats = new Map();
    onlineWorkers.forEach(w => {
        workerStats.set(w.token, { name: w.name, count: 0, success: 0, failed: 0 });
    });

    async function updateStatusMsg() {

        const now = Date.now();
        if (now - lastUpdateTime < 2000 && queue.length > 0) return;
        lastUpdateTime = now;
        const statsArray = Array.from(workerStats.values());
        const progressEmbed = createBroadcastEmbed(
            mode, totalUsers, onlineWorkers.length,
            totalSent, totalSuccess, totalFailed, totalDMsClosed, statsArray
        );
        await statusMsg.edit({ embeds: [progressEmbed] }).catch(() => { });
    }

    await updateStatusMsg();
    customLog("BROADCAST", `🚀 بدء بث لـ ${totalUsers} عضو باستخدام ${onlineWorkers.length} بوت مساعد.`);

    const workerPromises = onlineWorkers.map(async (worker) => {
        const stats = workerStats.get(worker.token);
        let consecutiveFails = 0;

        while (queue.length > 0) {

            if (worker.instance.status === "banned") {
                customLog("ERROR", `🚫 البوت ${worker.name} محظور! إيقاف إرساله.`);
                break;
            }


            if (worker.instance.status === "rate_limited") {
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue;
            }


            if (worker.instance.status !== "online") {
                customLog("WARNING", `⚠️ البوت ${worker.name} غير متصل. محاولة استرداد...`);
                await new Promise(resolve => setTimeout(resolve, CONFIG.WORKER_RECOVERY_DELAY));
                if (worker.instance.status !== "online") {
                    customLog("ERROR", `❌ فشل استرداد ${worker.name}. إيقاف إرساله.`);
                    break;
                }
            }


            if (consecutiveFails >= CONFIG.MAX_CONSECUTIVE_FAILS) {
                customLog("WARNING", `⚠️ ${worker.name}: ${consecutiveFails} فشل متتالي. استراحة 10 ثوانٍ...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                consecutiveFails = 0;
            }

            const userId = queue.shift();
            if (!userId) break;

            stats.count++;
            const result = await worker.instance.sendMessageWithRetry(userId, messageText);

            if (result === true) {
                stats.success++;
                totalSuccess++;
                consecutiveFails = 0;
            } else if (result === "dms_closed") {
                stats.failed++;
                totalFailed++;
                totalDMsClosed++;
                consecutiveFails = 0;
            } else if (result === "banned") {
                queue.unshift(userId);
                customLog("ERROR", `🚫 البوت ${worker.name} محظور! إعادة العضو ${userId} للطابور.`);
                break;
            } else if (result === "offline") {
                queue.unshift(userId);
                consecutiveFails++;
            } else {
                stats.failed++;
                totalFailed++;
                consecutiveFails++;
            }

            totalSent++;

            if (totalSent % CONFIG.UPDATE_INTERVAL === 0 || queue.length === 0) {
                await updateStatusMsg();
            }

            const delay = Math.floor(Math.random() * (CONFIG.DELAY_MAX - CONFIG.DELAY_MIN + 1) + CONFIG.DELAY_MIN);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    });

    await Promise.all(workerPromises);


    lastUpdateTime = 0;
    await updateStatusMsg();

    customLog("SUCCESS", `✅ اكتمل البث. نجاح: ${totalSuccess} | فشل: ${totalFailed} | خاص مغلق: ${totalDMsClosed}`);
    return { success: totalSuccess, failed: totalFailed, dmsClosed: totalDMsClosed };
}


client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(CONFIG.PREFIX)) return;

    const args = message.content.slice(CONFIG.PREFIX.length).split(" ");
    const command = args[0].toLowerCase();


    if (command !== "help" && !isOwner(message.author.id)) {
        if (OWNER_ID === "ضع_ايدي_هنا" || !OWNER_ID) {
            const warnEmbed = new Discord.EmbedBuilder()
                .setColor(VISUALS.WARN_COLOR)
                .setTitle("⚠️ لم يتم تحديد الأونر بعد")
                .setDescription(`يرجى تعديل **OWNER_ID** في ملف \`index.js\` وإدخال ID الديسكورد الخاص بك.`);
            await message.channel.send({ embeds: [warnEmbed] });
            return;
        }
        const denyEmbed = new Discord.EmbedBuilder()
            .setColor(VISUALS.ERROR_COLOR)
            .setTitle("🚫 غير مصرح لك")
            .setDescription(`هذا البوت خاص بالأونر فقط. لا تملك صلاحية تنفيذ هذا الأمر.`);
        await message.reply({ embeds: [denyEmbed] });

        await sendLog("ERROR", `**${message.author.tag}** (${message.author.id}) حاول تنفيذ أمر بدون صلاحية.`, [
            { name: "الأمر", value: `\`${CONFIG.PREFIX}${command}\``, inline: true },
            { name: "الروم", value: `<#${message.channel.id}>`, inline: true }
        ]);
        return;
    }


    if (command !== "help") {
        await sendLog("COMMAND", `**${message.author.tag}** نفّذ أمراً في <#${message.channel.id}>.`, [
            { name: "الأمر", value: `\`${message.content}\`` }
        ]);
    }


    if (command === "log") {
        const sub = args[1]?.toLowerCase();


        if (sub === "set") {
            logChannelId = message.channel.id;
            const embed = new Discord.EmbedBuilder()
                .setColor(VISUALS.SUCCESS_COLOR)
                .setTitle("✅ تم تحديد روم اللوق")
                .setDescription(`سيتم إرسال جميع سجلات النشاط إلى <#${logChannelId}> من الآن فصاعداً.`)
                .setTimestamp();
            await message.channel.send({ embeds: [embed] });
            await sendLog("LOGIN", `تم تحديد هذا الروم كروم للسجلات بواسطة **${message.author.tag}**.`);
            return;
        }


        if (sub === "off") {
            logChannelId = null;
            const embed = new Discord.EmbedBuilder()
                .setColor(VISUALS.WARN_COLOR)
                .setTitle("⛔ تم إيقاف اللوق")
                .setDescription("لن يتم إرسال أي سجلات حتى تُعيد تفعيله بـ `e!log set`.");
            await message.channel.send({ embeds: [embed] });
            return;
        }


        if (sub === "status") {
            const embed = new Discord.EmbedBuilder()
                .setColor(VISUALS.PANEL_COLOR)
                .setTitle("📋 حالة نظام اللوق")
                .setDescription(logChannelId
                    ? `✅ **اللوق مفعّل** — الروم: <#${logChannelId}>`
                    : `❌ **اللوق معطّل** — استخدم \`e!log set\` في أي روم لتفعيله.`);
            await message.channel.send({ embeds: [embed] });
            return;
        }


        const embed = new Discord.EmbedBuilder()
            .setColor(VISUALS.PANEL_COLOR)
            .setTitle("📋 أمر اللوق — طريقة الاستخدام")
            .addFields(
                { name: "`e!log set`", value: "تحديد الروم الحالي كروم سجلات" },
                { name: "`e!log off`", value: "إيقاف إرسال السجلات" },
                { name: "`e!log status`", value: "عرض حالة نظام اللوق" }
            );
        await message.channel.send({ embeds: [embed] });
        return;
    }


    if (command === "panel") {
        const data = await readData();
        const embed = createMainPanelEmbed(data);
        const rows = createMainPanelContainer();

        await message.channel.send({
            embeds: [embed],
            components: rows
        });
    }


    else if (command === "bd") {
        const messageText = args.slice(1).join(" ");
        if (!messageText) {
            const usageEmbed = createPremiumEmbed({
                title: "❌ خطأ في الاستخدام",
                description: `طريقة الاستخدام: \`${CONFIG.PREFIX}bd <الرسالة>\`\n\n*البوت يدعم الـ Spintax مثل \`{مرحبا|أهلا} {user}\`*`,
                color: VISUALS.ERROR_COLOR,
                image: VISUALS.GIFS.ERROR
            });
            await message.channel.send({ embeds: [usageEmbed] });
            return;
        }

        const data = await readData();
        const onlineCount = data.workers.filter(w => w.status === "online").length;

        if (onlineCount === 0) {
            const errEmbed = createPremiumEmbed({
                title: "❌ لا يوجد بوتات متصلة",
                description: "لا يمكنك بدء البث لعدم وجود حسابات مساعدة نشطة حالياً.",
                color: VISUALS.ERROR_COLOR,
                image: VISUALS.GIFS.ERROR
            });
            await message.channel.send({ embeds: [errEmbed] });
            return;
        }

        const loadingEmbed = createPremiumEmbed({
            title: "🔍 جاري تهيئة البث",
            description: "جاري سحب قائمة أعضاء السيرفر... يرجى الانتظار.",
            color: VISUALS.PANEL_COLOR,
            image: VISUALS.GIFS.CHECK
        });

        const statusMsg = await message.channel.send({ embeds: [loadingEmbed] });
        await sendLog("BROADCAST", `**${message.author.tag}** بدأ بثاً لجميع الأعضاء.`, [
            { name: "الرسالة", value: `\`${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}\`` },
            { name: "الروم", value: `<#${message.channel.id}>`, inline: true }
        ]);
        const members = await getAllMembers(message.guild);

        if (members.length === 0) {
            const noMembersEmbed = createPremiumEmbed({
                title: "❌ لم يتم العثور على أعضاء",
                description: "فشل جلب قائمة الأعضاء. تأكد من تفعيل صلاحيات الـ `Server Members Intent` لبوت التحكم الرئيسي.",
                color: VISUALS.ERROR_COLOR,
                image: VISUALS.GIFS.ERROR
            });
            await statusMsg.edit({ embeds: [noMembersEmbed] });
            return;
        }

        const result = await parallelBroadcast(members, messageText, statusMsg, "all");

        const finalEmbed = createPremiumEmbed({
            title: "🎉 تم اكتمال الإرسال بنجاح",
            description: `تم الانتهاء من إرسال البث الجماعي لجميع الأعضاء (**${members.length}** عضو):\n\n` +
                `✅ **نجاح الإرسال:** \`${result.success}\` رسالة\n` +
                `❌ **فشل الإرسال:** \`${result.failed}\` رسالة (🔒 خاص مغلق: \`${result.dmsClosed}\`)\n` +
                `📈 **نسبة النجاح الإجمالية:** \`${((result.success / members.length) * 100).toFixed(1)}%\``,
            color: VISUALS.SUCCESS_COLOR,
            image: VISUALS.GIFS.COMPLETE
        });

        await statusMsg.edit({ embeds: [finalEmbed] });
        await sendLog("BROADCAST_END", `اكتمل البث لجميع الأعضاء بواسطة **${message.author.tag}**.`, [
            { name: "✅ نجاح", value: `\`${result.success}\``, inline: true },
            { name: "❌ فشل", value: `\`${result.failed}\``, inline: true },
            { name: "🔒 خاص مغلق", value: `\`${result.dmsClosed}\``, inline: true },
            { name: "📈 نسبة النجاح", value: `\`${((result.success / members.length) * 100).toFixed(1)}%\``, inline: true }
        ]);
        data.stats.totalSent += result.success;
        data.stats.totalFailed += result.failed;
        data.stats.lastBroadcast = new Date().toISOString();
        await writeData(data);
    }


    else if (command === "bdo") {
        const messageText = args.slice(1).join(" ");
        if (!messageText) {
            const usageEmbed = createPremiumEmbed({
                title: "❌ خطأ في الاستخدام",
                description: `طريقة الاستخدام: \`${CONFIG.PREFIX}bdo <الرسالة>\`\n\n*البوت يدعم الـ Spintax مثل \`{مرحباً|أهلاً} {user}\`*`,
                color: VISUALS.ERROR_COLOR,
                image: VISUALS.GIFS.ERROR
            });
            await message.channel.send({ embeds: [usageEmbed] });
            return;
        }

        const data = await readData();
        const onlineCount = data.workers.filter(w => w.status === "online").length;

        if (onlineCount === 0) {
            const errEmbed = createPremiumEmbed({
                title: "❌ لا يوجد بوتات متصلة",
                description: "لا يمكنك بدء البث لعدم وجود حسابات مساعدة نشطة حالياً.",
                color: VISUALS.ERROR_COLOR,
                image: VISUALS.GIFS.ERROR
            });
            await message.channel.send({ embeds: [errEmbed] });
            return;
        }

        const loadingEmbed = createPremiumEmbed({
            title: "🔍 جاري تهيئة البث للمتصلين",
            description: "جاري سحب قائمة الأعضاء النشطين متصلي الحالة... يرجى الانتظار.",
            color: VISUALS.PANEL_COLOR,
            image: VISUALS.GIFS.CHECK
        });

        const statusMsg = await message.channel.send({ embeds: [loadingEmbed] });
        await sendLog("BROADCAST", `**${message.author.tag}** بدأ بثاً للمتصلين فقط.`, [
            { name: "الرسالة", value: `\`${messageText.substring(0, 100)}${messageText.length > 100 ? '...' : ''}\`` },
            { name: "الروم", value: `<#${message.channel.id}>`, inline: true }
        ]);
        const onlineMembers = await getOnlineMembers(message.guild);

        if (onlineMembers.length === 0) {
            const noMembersEmbed = createPremiumEmbed({
                title: "❌ لم يتم العثور على أعضاء نشطين",
                description: "فشل العثور على أعضاء متصلين حالياً. تأكد من تفعيل صلاحيات الـ `Guild Presences Intent` للبوت الرئيسي.",
                color: VISUALS.ERROR_COLOR,
                image: VISUALS.GIFS.ERROR
            });
            await statusMsg.edit({ embeds: [noMembersEmbed] });
            return;
        }

        const result = await parallelBroadcast(onlineMembers, messageText, statusMsg, "online");

        const finalEmbed = createPremiumEmbed({
            title: "🎉 تم اكتمال الإرسال بنجاح",
            description: `تم الانتهاء من البث لجميع الأعضاء المتصلين (**${onlineMembers.length}** عضو):\n\n` +
                `✅ **نجاح الإرسال:** \`${result.success}\` رسالة\n` +
                `❌ **فشل الإرسال:** \`${result.failed}\` رسالة (🔒 خاص مغلق: \`${result.dmsClosed}\`)\n` +
                `📈 **نسبة النجاح الإجمالية:** \`${((result.success / onlineMembers.length) * 100).toFixed(1)}%\``,
            color: VISUALS.SUCCESS_COLOR,
            image: VISUALS.GIFS.COMPLETE
        });

        await statusMsg.edit({ embeds: [finalEmbed] });
        await sendLog("BROADCAST_END", `اكتمل البث للمتصلين بواسطة **${message.author.tag}**.`, [
            { name: "✅ نجاح", value: `\`${result.success}\``, inline: true },
            { name: "❌ فشل", value: `\`${result.failed}\``, inline: true },
            { name: "🔒 خاص مغلق", value: `\`${result.dmsClosed}\``, inline: true },
            { name: "📈 نسبة النجاح", value: `\`${((result.success / onlineMembers.length) * 100).toFixed(1)}%\``, inline: true }
        ]);
        data.stats.totalSent += result.success;
        data.stats.totalFailed += result.failed;
        data.stats.lastBroadcast = new Date().toISOString();
        await writeData(data);
    }


    else if (command === "user" && message.mentions.users.first()) {
        const targetUser = message.mentions.users.first();
        const avatarUrl = targetUser.displayAvatarURL({ extension: "png", size: 256 });
        const username = targetUser.username;

        const data = await readData();
        const onlineWorkers = data.workers.filter(w => w.status === "online");

        if (onlineWorkers.length === 0) {
            const errEmbed = createPremiumEmbed({
                title: "❌ لا يوجد بوتات نشطة",
                description: "لا يوجد بوتات مساعدة متصلة حالياً لتغيير هويتها وتصميمها.",
                color: VISUALS.ERROR_COLOR,
                image: VISUALS.GIFS.ERROR
            });
            await message.channel.send({ embeds: [errEmbed] });
            return;
        }

        const loadingEmbed = createPremiumEmbed({
            title: "🔄 جاري محاكاة هوية المستخدم",
            description: `جاري تغيير أفتارات وأسماء **${onlineWorkers.length}** بوت لمطابقة الحساب **${username}**...`,
            color: VISUALS.PANEL_COLOR,
            image: VISUALS.GIFS.CHECK
        });

        const statusMsg = await message.channel.send({ embeds: [loadingEmbed] });

        let successCount = 0;
        for (let i = 0; i < onlineWorkers.length; i++) {
            const worker = onlineWorkers[i];
            const botInstance = activeWorkers.get(worker.token);
            if (botInstance) {
                const avatarSuccess = await botInstance.setAvatar(avatarUrl);
                const nameSuccess = await botInstance.setUsername(username);
                if (avatarSuccess || nameSuccess) {
                    successCount++;
                }

                const progressEmbed = createPremiumEmbed({
                    title: "🔄 تخصيص الهوية قيد التنفيذ",
                    description: `تحديث البوتات:\n` +
                        `التقدم الحالي: **${successCount}** / **${onlineWorkers.length}**\n` +
                        `البوت المستهدف: **${worker.name}** ➔ **${username}**`,
                    color: VISUALS.PANEL_COLOR,
                    image: VISUALS.GIFS.CHECK
                });

                await statusMsg.edit({ embeds: [progressEmbed] });
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }

        const finalEmbed = createPremiumEmbed({
            title: "✅ اكتملت محاكاة الهوية",
            description: `تم بنجاح تغيير تصميم وشكل البوتات المساعدة هيدر وأفتار!\n\n` +
                `👤 **الحساب المحاكى:** ${targetUser} (\`${username}\`)\n` +
                `🤖 **عدد البوتات المعدلة:** \`${successCount}\` / \`${onlineWorkers.length}\``,
            color: VISUALS.SUCCESS_COLOR,
            image: VISUALS.GIFS.COMPLETE
        });

        await statusMsg.edit({ embeds: [finalEmbed] });
        await sendLog("IDENTITY", `**${message.author.tag}** غيّر هوية البوتات المساعدة.`, [
            { name: "الحساب المحاكى", value: `${targetUser.tag}`, inline: true },
            { name: "البوتات المعدّلة", value: `\`${successCount}/${onlineWorkers.length}\``, inline: true }
        ]);
    }


    else if (command === "check") {
        const loadingEmbed = createPremiumEmbed({
            title: "🔍 فحص التوكنات والاتصالات",
            description: "جاري الاتصال بخوادم ديسكورد وفحص صلاحية التوكنات المسجلة حالياً...",
            color: VISUALS.PANEL_COLOR,
            image: VISUALS.GIFS.CHECK
        });

        const statusMsg = await message.channel.send({ embeds: [loadingEmbed] });
        const result = await checkAllTokens();

        const resultEmbed = createPremiumEmbed({
            title: "🔍 تقرير فحص التوكنات الشامل",
            description: `تم الانتهاء من عملية الفحص والتحقق:\n\n` +
                `🟢 **توكنات صالحة:** \`${result.valid}\` حسابات\n` +
                `🔴 **توكنات معطلة:** \`${result.invalid}\` حسابات\n` +
                `🚫 **توكنات محظورة (باند):** \`${result.banned}\` حسابات\n` +
                `📊 **الإجمالي الكلي للتوكنات:** \`${result.total}\` حسابات`,
            color: result.invalid > 0 || result.banned > 0 ? VISUALS.WARN_COLOR : VISUALS.SUCCESS_COLOR,
            image: VISUALS.GIFS.COMPLETE
        });

        await statusMsg.edit({ embeds: [resultEmbed] });
        await sendLog("STATUS", `**${message.author.tag}** فحص التوكنات.`, [
            { name: "🟢 صالحة", value: `\`${result.valid}\``, inline: true },
            { name: "🔴 معطلة", value: `\`${result.invalid}\``, inline: true },
            { name: "🚫 محظورة", value: `\`${result.banned}\``, inline: true }
        ]);
    }


    else if (command === "refresh") {
        const loadingEmbed = createPremiumEmbed({
            title: "🔄 جاري إعادة تنشيط النظام",
            description: "جاري تنظيف الجلسات وإعادة تشغيل التوكنات المتوقفة لحل أي مشاكل فنية...",
            color: VISUALS.PANEL_COLOR,
            image: VISUALS.GIFS.CHECK
        });

        const statusMsg = await message.channel.send({ embeds: [loadingEmbed] });
        const result = await refreshSystem();

        const resultEmbed = createPremiumEmbed({
            title: "🔄 اكتملت إعادة التنشيط",
            description: `تم تهيئة النظام وإعادة التشغيل بنجاح:\n\n` +
                `🟢 **الحسابات النشطة الآن:** \`${result.refreshed}\` بوتات\n` +
                `🗑️ **الحسابات التالفة التي أزيلت:** \`${result.removed}\` حسابات`,
            color: VISUALS.SUCCESS_COLOR,
            image: VISUALS.GIFS.COMPLETE
        });

        await statusMsg.edit({ embeds: [resultEmbed] });
        await sendLog("REFRESH", `**${message.author.tag}** أعاد تنشيط النظام.`, [
            { name: "🟢 نشط الآن", value: `\`${result.refreshed}\``, inline: true },
            { name: "🗑️ حُذف", value: `\`${result.removed}\``, inline: true }
        ]);
    }


    else if (command === "stats") {
        const data = await readData();
        const online = data.workers.filter(w => w.status === "online").length;
        const totalAttempts = data.stats.totalSent + data.stats.totalFailed;
        const rate = totalAttempts === 0 ? "0.0" : ((data.stats.totalSent / totalAttempts) * 100).toFixed(1);

        const statsEmbed = createPremiumEmbed({
            title: "📊 إحصائيات النظام الشاملة",
            description: "تحليل دقيق لأداء عمليات الإرسال الحالية وقائمة التوزيع.",
            color: VISUALS.PANEL_COLOR,
            fields: [
                { name: "🤖 إجمالي الحسابات", value: `\`${data.workers.length}\` بوتات`, inline: true },
                { name: "🟢 الحسابات المتصلة", value: `\`${online}\` متصل`, inline: true },
                { name: "📨 رسائل ناجحة", value: `\`${data.stats.totalSent}\` DMs`, inline: true },
                { name: "❌ رسائل فشلت", value: `\`${data.stats.totalFailed}\` DMs`, inline: true },
                { name: "📈 دقة النجاح", value: `\`${rate}%\``, inline: true },
                { name: "🕐 آخر عملية بث", value: data.stats.lastBroadcast ? `\`${new Date(data.stats.lastBroadcast).toLocaleString('ar-EG')}\`` : "`لا يوجد`", inline: true }
            ],
            image: VISUALS.GIFS.DASHBOARD
        });

        await message.channel.send({ embeds: [statsEmbed] });
    }


    else if (command === "help") {
        const helpEmbed = createPremiumEmbed({
            title: "⚙️ قائمة أوامر نظام البث",
            description: `يمكنك استخدام الأوامر التالية بالبادئة المحددة \`${CONFIG.PREFIX}\` لتشغيل البوت:`,
            color: VISUALS.PANEL_COLOR,
            fields: [
                { name: `🕹️ لوحة التحكم الرئيسية`, value: `\`${CONFIG.PREFIX}panel\` - يظهر لوحة الأزرار التفاعلية للتحكم بالتوكنات.` },
                { name: `📢 بث جماعي للجميع`, value: `\`${CONFIG.PREFIX}bd <الرسالة>\` - إرسال رسالة خاصة لجميع أعضاء السيرفر بالتناوب.` },
                { name: `🟢 بث للمتصلين فقط`, value: `\`${CONFIG.PREFIX}bdo <الرسالة>\` - إرسال رسالة خاصة للأعضاء المتصلين حالياً فقط.` },
                { name: `👥 محاكاة وتطابق الهوية`, value: `\`${CONFIG.PREFIX}user @user\` - يقوم بنسخ صورة واسم أي شخص وتطبيقها على بوتاتك.` },
                { name: `🔍 فحص التوكنات`, value: `\`${CONFIG.PREFIX}check\` - فحص شامل لحالات الاتصال وصلاحيات البوتات المساعدة.` },
                { name: `🔄 إعادة تهيئة النظام`, value: `\`${CONFIG.PREFIX}refresh\` - إعادة الاتصال بالبوتات المتوقفة وتنظيف الجلسات.` },
                { name: `📊 الإحصائيات العامة`, value: `\`${CONFIG.PREFIX}stats\` - يعرض تقرير رقمي مفصل عن رسائل النجاح والفشل.` },
                { name: `💡 دعم الـ Spintax المتغير`, value: `استخدم الأقواس المتعرجة لتغيير محتوى الرسالة تلقائياً لكل شخص لتفادي الحظر:\n*مثال:* \`{مرحباً|أهلاً} {user} تفقد موقعنا.\`` }
            ],
            image: VISUALS.GIFS.DASHBOARD
        });

        await message.channel.send({ embeds: [helpEmbed] });
    }
});


client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    function createQuickEmbed(title, description, color = VISUALS.PANEL_COLOR) {
        return new Discord.EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color);
    }


    if (!isOwner(interaction.user.id)) {
        await sendLog("ERROR", `**${interaction.user.tag}** حاول استخدام زر بدون صلاحية.`, [
            { name: "الزر", value: `\`${interaction.customId}\``, inline: true }
        ]);
        return interaction.reply({
            embeds: [createQuickEmbed("🚫 غير مصرح لك", "هذا البوت خاص بالأونر فقط.", VISUALS.ERROR_COLOR)],
            ephemeral: true
        });
    }

    if (interaction.customId === "add_token") {
        const modal = new Discord.ModalBuilder()
            .setCustomId("add_token_modal")
            .setTitle("➕ إضافة توكن مساعد");

        const tokenInput = new Discord.TextInputBuilder()
            .setCustomId("token_input")
            .setLabel("توكن البوت المساعد")
            .setStyle(Discord.TextInputStyle.Short)
            .setPlaceholder("أدخل هنا توكن البوت المساعد الجديد")
            .setRequired(true);

        modal.addComponents(new Discord.ActionRowBuilder().addComponents(tokenInput));
        await interaction.showModal(modal);
    }

    if (interaction.customId === "remove_token") {
        const data = await readData();
        if (data.workers.length === 0) {
            return interaction.reply({
                embeds: [createQuickEmbed("❌ خطأ في العملية", "لا يوجد أي توكنات مسجلة في قاعدة البيانات لإزالتها.", VISUALS.ERROR_COLOR)],
                ephemeral: true
            });
        }

        const selectMenu = new Discord.StringSelectMenuBuilder()
            .setCustomId("select_token_remove")
            .setPlaceholder("حدد الحساب المساعد الذي ترغب بإزالته")
            .addOptions(
                data.workers.slice(0, 25).map(worker => ({
                    label: worker.name || "حساب غير معرف",
                    description: `${worker.token.substring(0, 25)}...`,
                    value: worker.token
                }))
            );

        const row = new Discord.ActionRowBuilder().addComponents(selectMenu);
        const embed = createPremiumEmbed({
            title: "🗑️ إزالة حساب مساعد من النظام",
            description: "اختر البوت المساعد الذي ترغب بإزالته وفصل اتصاله نهائياً من القائمة التفاعلية بالأسفل:",
            color: VISUALS.WARN_COLOR
        });


        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }

    if (interaction.customId === "dm_tokens") {
        const data = await readData();
        if (data.workers.length === 0) {
            return interaction.reply({
                embeds: [createQuickEmbed("❌ خطأ في العملية", "لا توجد توكنات مسجلة لعرضها.", VISUALS.ERROR_COLOR)],
                ephemeral: true
            });
        }

        let tokensList = "📋 **قائمة توكنات البوتات المساعدة المسجلة:**\n\n";
        data.workers.forEach((w, i) => {
            tokensList += `**${i + 1}. الاسم:** \`${w.name || "غير معرف"}\`\n🔑 **التوكن:** \`${w.token}\`\n\n`;
        });

        const dmEmbed = createPremiumEmbed({
            title: "📬 قائمة توكنات البوت السرية الخاص بك",
            description: tokensList,
            color: VISUALS.PANEL_COLOR
        });

        try {
            await interaction.user.send({ embeds: [dmEmbed] });
            await interaction.reply({
                embeds: [createQuickEmbed("📬 تم إرسال القائمة", "تم إرسال قائمة التوكنات بالكامل بأمان لرسائلك الخاصة.", VISUALS.SUCCESS_COLOR)],
                ephemeral: true
            });
        } catch {
            await interaction.reply({
                embeds: [createQuickEmbed("❌ فشل الإرسال الخاص", "فشل إرسال التوكنات لخاصك. يرجى التأكد من فتح الرسائل الخاصة للسيرفر.", VISUALS.ERROR_COLOR)],
                ephemeral: true
            });
        }
    }

    if (interaction.customId === "kick_bots") {
        const data = await readData();
        const onlineWorkers = data.workers.filter(w => w.status === "online");

        if (onlineWorkers.length === 0) {
            return interaction.reply({
                embeds: [createQuickEmbed("❌ خطأ في العملية", "لا توجد بوتات مساعدة متصلة حالياً ليتم طردها.", VISUALS.ERROR_COLOR)],
                ephemeral: true
            });
        }

        const loadingEmbed = createPremiumEmbed({
            title: "🚪 طرد البوتات المساعدة من السيرفر",
            description: `جاري طرد ومغادرة **${onlineWorkers.length}** بوت مساعد من السيرفر الحالي...`,
            color: VISUALS.WARN_COLOR,
            image: VISUALS.GIFS.CHECK
        });

        await interaction.reply({
            embeds: [loadingEmbed],
            ephemeral: true
        });

        let kicked = 0;
        for (const worker of onlineWorkers) {
            const botInstance = activeWorkers.get(worker.token);
            if (botInstance) {
                const success = await botInstance.kickFromServer(interaction.guild.id);
                if (success) kicked++;
                await new Promise(resolve => setTimeout(resolve, 1200));
            }
        }

        const finalEmbed = createPremiumEmbed({
            title: "🚪 تم مغادرة الحسابات بنجاح",
            description: `تمت مغادرة وخروج الحسابات المسجلة:\n\n✅ **تم الخروج بنجاح:** \`${kicked}\` بوت\n❌ **فشل الخروج:** \`${onlineWorkers.length - kicked}\` بوت`,
            color: VISUALS.SUCCESS_COLOR,
            image: VISUALS.GIFS.COMPLETE
        });

        await interaction.editReply({ embeds: [finalEmbed] });
        await sendLog("KICK", `**${interaction.user.tag}** طرد البوتات من السيرفر.`, [
            { name: "تم طردهم", value: `\`${kicked}/${onlineWorkers.length}\``, inline: true }
        ]);
    }
});


client.on("interactionCreate", async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;

    function createQuickEmbed(title, description, color = VISUALS.PANEL_COLOR) {
        return new Discord.EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color);
    }


    if (!isOwner(interaction.user.id)) {
        return interaction.reply({
            embeds: [createQuickEmbed("🚫 غير مصرح لك", "هذا البوت خاص بالأونر فقط.", VISUALS.ERROR_COLOR)],
            ephemeral: true
        });
    }

    if (interaction.customId === "select_token_remove") {
        const tokenToRemove = interaction.values[0];
        const data = await readData();
        const index = data.workers.findIndex(w => w.token === tokenToRemove);

        if (index === -1) {
            return interaction.reply({
                embeds: [createQuickEmbed("❌ خطأ", "التوكن المحدد غير متواجد بقاعدة البيانات.", VISUALS.ERROR_COLOR)],
                ephemeral: true
            });
        }

        const removed = data.workers[index];
        const worker = activeWorkers.get(removed.token);
        if (worker) worker.stop();
        activeWorkers.delete(removed.token);

        data.workers.splice(index, 1);
        await writeData(data);

        const successEmbed = createPremiumEmbed({
            title: "🗑️ تم إزالة التوكن بنجاح",
            description: `تم فصل وإلغاء اتصال البوت المساعد **${removed.name}** وحذفه من قائمة المسجلين.`,
            color: VISUALS.SUCCESS_COLOR,
            image: VISUALS.GIFS.COMPLETE
        });

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });
        await sendLog("TOKEN_DEL", `**${interaction.user.tag}** حذف توكن مساعد.`, [
            { name: "اسم البوت", value: `\`${removed.name}\``, inline: true },
            { name: "الآيدي", value: `\`${removed.id}\``, inline: true }
        ]);
    }
});


client.on("interactionCreate", async (interaction) => {
    if (!interaction.isModalSubmit()) return;

    function createQuickEmbed(title, description, color = VISUALS.PANEL_COLOR) {
        return new Discord.EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color);
    }


    if (!isOwner(interaction.user.id)) {
        return interaction.reply({
            embeds: [createQuickEmbed("🚫 غير مصرح لك", "هذا البوت خاص بالأونر فقط.", VISUALS.ERROR_COLOR)],
            ephemeral: true
        });
    }

    if (interaction.customId === "add_token_modal") {
        const token = interaction.fields.getTextInputValue("token_input");

        const loadingEmbed = createPremiumEmbed({
            title: "🔄 جاري فحص وربط الحساب المساعد",
            description: "جاري محاولة الاتصال والتحقق من التوكن المدخل مع سيرفرات ديسكورد الرسمية...",
            color: VISUALS.PANEL_COLOR,
            image: VISUALS.GIFS.CHECK
        });

        await interaction.reply({
            embeds: [loadingEmbed],
            ephemeral: true
        });

        const testClient = new Discord.Client({ intents: [] });

        try {
            await testClient.login(token);
            const botInfo = testClient.user;
            testClient.destroy();

            const data = await readData();

            if (data.workers.some(w => w.token === token)) {
                await interaction.editReply({
                    embeds: [createQuickEmbed("❌ التوكن مسجل مسبقاً", "هذا الحساب المساعد مسجل بالفعل في نظام قاعدة البيانات لديك.", VISUALS.ERROR_COLOR)]
                });
                return;
            }

            const worker = new WorkerBot(token);
            const success = await worker.start();

            if (success) {
                data.workers.push({
                    token: token,
                    name: botInfo.tag,
                    id: botInfo.id,
                    status: "online",
                    addedAt: new Date().toISOString()
                });
                await writeData(data);
                activeWorkers.set(token, worker);

                const successEmbed = createPremiumEmbed({
                    title: "✅ تم تسجيل الحساب بنجاح",
                    description: `تم ربط وتشغيل البوت المساعد **${botInfo.tag}** بنجاح وإدخاله في نظام توزيع الإرسال!`,
                    color: VISUALS.SUCCESS_COLOR,
                    image: VISUALS.GIFS.COMPLETE
                });

                await interaction.editReply({ embeds: [successEmbed] });
                await sendLog("TOKEN_ADD", `**${interaction.user.tag}** أضاف توكن مساعداً جديداً.`, [
                    { name: "اسم البوت", value: `\`${botInfo.tag}\``, inline: true },
                    { name: "الآيدي", value: `\`${botInfo.id}\``, inline: true }
                ]);
            } else {
                await interaction.editReply({
                    embeds: [createQuickEmbed("❌ فشل تشغيل الجلسة", "نجح تسجيل الدخول ولكن فشل تشغيل الحساب المساعد كبوت نشط.", VISUALS.ERROR_COLOR)]
                });
            }
        } catch (error) {
            await interaction.editReply({
                embeds: [createQuickEmbed("❌ توكن غير صالح", `فشل تسجيل الدخول للتوكن المدخل. خطأ: \`${error.message}\`. يرجى التحقق من صحته.`, VISUALS.ERROR_COLOR)]
            });
            await sendLog("ERROR", `فشل إضافة توكن بواسطة **${interaction.user.tag}**.`, [
                { name: "الخطأ", value: `\`${error.message}\`` }
            ]);
        }
    }
});


process.on("unhandledRejection", (reason) => {
    customLog("ERROR", `خطأ غير متوقع (unhandledRejection): ${reason?.message || reason}`);
});

process.on("uncaughtException", (error) => {
    customLog("ERROR", `استثناء غير محتجز (uncaughtException): ${error.message}`);
});


async function start() {
    printConsoleHeader();
    customLog("SYSTEM", "جاري تهيئة وتشغيل البوتات المساعدة...");
    await initWorkers();

    if (MAIN_BOT_TOKEN === "توكن_البوت" || !MAIN_BOT_TOKEN) {
        customLog("WARNING", "يرجى استبدال 'توكن_البوت' في ملف index.js بتوكن البوت الرئيسي الخاص بك.");
        return;
    }

    client.once("ready", async () => {
        printConsoleHeader();
        customLog("SUCCESS", `✅ البوت الرئيسي متصل: ${client.user.tag}`);
        customLog("INFO", `🤖 البوتات المساعدة النشطة: ${activeWorkers.size}`);
        customLog("INFO", `🔑 البادئة: ${CONFIG.PREFIX}`);
        customLog("INFO", `⏱️ التأخير: ${CONFIG.DELAY_MIN}ms - ${CONFIG.DELAY_MAX}ms`);
        customLog("INFO", `⌨️ محاكاة الكتابة: ${CONFIG.SIMULATE_TYPING ? "مفعلة" : "معطلة"}`);
        customLog("SYSTEM", `💡 اكتب ${CONFIG.PREFIX}help لعرض الأوامر.`);
        customLog("INFO", `🔑 OWNER_ID: ${OWNER_ID === "ضع_ايدي_هنا" ? "⚠️ لم يُحدد بعد!" : OWNER_ID}`);


        await sendLog("LOGIN", `تم تشغيل البوت الرئيسي بنجاح.`, [
            { name: "اسم البوت", value: `\`${client.user.tag}\``, inline: true },
            { name: "البوتات النشطة", value: `\`${activeWorkers.size}\``, inline: true }
        ]);


        setInterval(async () => {
            customLog("SYSTEM", "🔄 تجديد جلسات البوتات التلقائي...");
            await refreshSystem();
            customLog("SUCCESS", `✅ تم تجديد الجلسات. نشط الآن: ${activeWorkers.size} بوت`);
        }, CONFIG.WORKER_RESTART_INTERVAL);
    });

    client.on("error", (error) => {
        customLog("ERROR", `خطأ في البوت الرئيسي: ${error.message}`);
    });

    client.on("disconnect", () => {
        customLog("WARNING", "⚠️ انقطع اتصال البوت الرئيسي. محاولة إعادة الاتصال تلقائياً...");
    });

    try {
        await client.login(MAIN_BOT_TOKEN);
    } catch (error) {
        customLog("ERROR", `❌ فشل تسجيل دخول البوت الرئيسي: ${error.message}`);
        process.exit(1);
    }
}

start().catch((err) => {
    console.error("خطأ فادح في بدء التشغيل:", err);
    process.exit(1);
});
