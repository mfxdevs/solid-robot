const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const os = require('os');

const bot = new Telegraf('8121451942:AAGY9ckXDIeTesGYdTXqjuv1brQENc7bmVo');
const adminId = 7407125972;
const bannedUsers = new Set();
const usersFile = path.join(__dirname, 'users.json');

if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]), 'utf8');
let users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));

bot.use((ctx, next) => {
    const userId = ctx.message?.from?.id;
    const username = ctx.message?.from?.username || 'Unknown';

    if (!users.find(user => user.id === userId)) {
        users.push({ id: userId, username });
        fs.writeFileSync(usersFile, JSON.stringify(users), 'utf8');
    }

    if (bannedUsers.has(userId)) {
        return ctx.reply('Oh no~ You’re not allowed to access me anymore. My Master has forbidden it!');
    }

    return next();
});

bot.command('start', (ctx) => {
    const welcomeMessage = `
Hello, my lovely master! I’m *Rias Gremory*, here to guide you through managing your bot effortlessly. 💕
Here’s what I can do for you:
`;

    const buttons = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Deploy Your Bot', 'deploy')],
        [Markup.button.callback('🔗 Pair Session', 'pair')],
        [Markup.button.callback('🛑 Stop Your Bot', 'stop')],
        [Markup.button.callback('📊 Check Bot Status', 'status')],
        [Markup.button.callback('⚙️ Admin Options', 'admin')],
    ]);

    ctx.replyWithMarkdown(welcomeMessage, buttons);
});

bot.action('deploy', (ctx) => {
    const userId = ctx.from.id;
    const userDir = path.join(__dirname, 'users', `${userId}`, 'Queen-RiasV3');
    const repoUrl = 'https://github.com/Toxic1239/Queen-RiasV3_';

    ctx.reply('Hmm~ Deploying your bot now! Please wait a moment, okay?');

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(path.join(__dirname, 'users', `${userId}`), { recursive: true });

        exec(`git clone ${repoUrl}`, { cwd: path.join(__dirname, 'users', `${userId}`) }, (error, stdout, stderr) => {
            if (error) return ctx.reply(`Oh no! Something went wrong during deployment. Error: ${stderr}`);
            ctx.reply('Yay! I’ve cloned the repository successfully. Installing your bot’s tools now~ 💫');
            exec('yarn install', { cwd: userDir }, (err) => {
                if (err) return ctx.reply(`Oops! I couldn’t install the tools. Error: ${err.message}`);
                ctx.reply('Everything’s ready now! You can use /pair <session_id> to connect your bot to WhatsApp.');
            });
        });
    } else {
        ctx.reply('Oh my~ It seems your bot is already deployed! Use /pair to link it with your session.');
    }
});

bot.command('pair', (ctx) => {
    const userId = ctx.message.from.id;
    const sessionId = ctx.message.text.split(' ')[1];

    if (!sessionId) {
        return ctx.reply('You forgot the session ID, my dear! Please provide it like this: /pair <session_id>');
    }

    const userDir = path.join(__dirname, 'users', `${userId}`, 'Queen-RiasV3');
    const configPath = path.join(userDir, 'config.js');

    if (!fs.existsSync(configPath)) {
        return ctx.reply('Oh no! I couldn’t find your bot’s configuration. Did you deploy it yet?');
    }

    fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) return ctx.reply('Ahh! I couldn’t read your bot’s configuration file.');

        const updatedConfig = data.replace(/sessionId:\s*process.env.SESSION_ID\s*\|\| ''/, `sessionId: '${sessionId}'`);

        fs.writeFile(configPath, updatedConfig, 'utf8', (writeErr) => {
            if (writeErr) return ctx.reply('Oops! I couldn’t update the configuration.');
            ctx.reply('All set, Master! The session ID is now paired. Use /run to start your bot.');
        });
    });
});

bot.command('run', (ctx) => {
    const userId = ctx.message.from.id;
    const userDir = path.join(__dirname, 'users', `${userId}`, 'Queen-RiasV3');

    if (!fs.existsSync(userDir)) {
        return ctx.reply(`Oh my~ It seems your bot hasn’t been deployed yet. Please use the "🚀 Deploy Your Bot" option first, okay?`);
    }

    ctx.reply('Alright, darling~ I’m starting your bot now. Let me sprinkle a little magic for you! ✨');

    exec('node index.js', { cwd: userDir }, (error, stdout, stderr) => {
        if (error) {
            return ctx.reply(`Oh no! Something went wrong while starting your bot. Here’s what I found:\n\`\`\`${stderr}\`\`\`\nLet me know if you’d like me to try again!`, { parse_mode: 'Markdown' });
        }

        ctx.reply(`Ta-da~! Your bot is now running smoothly. Here’s what it said while starting up:\n\`\`\`${stdout}\`\`\`\nIf you need anything else, just let me know, my dear!`, { parse_mode: 'Markdown' });
    });
});

bot.action('status', (ctx) => {
    const userId = ctx.from.id;
    const userDir = path.join(__dirname, 'users', `${userId}`);

    const statusMessage = `
Your bot’s current state:
**Status**: ${fs.existsSync(userDir) ? 'Deployed 🟢' : 'Not Deployed 🔴'}
**Memory Available**: ${(os.freemem() / (1024 * 1024)).toFixed(2)} MB
**System Uptime**: ${Math.floor(os.uptime() / 60)} minutes
`;

    ctx.replyWithMarkdown(statusMessage);
});

bot.action('admin', (ctx) => {
    if (ctx.from.id !== adminId) {
        return ctx.reply('Sorry, darling~ Only my Master can access the admin menu!');
    }

    const adminButtons = Markup.inlineKeyboard([
        [Markup.button.callback('👤 View Users', 'view_users')],
        [Markup.button.callback('🚫 Ban User', 'ban_user')],
        [Markup.button.callback('✅ Unban User', 'unban_user')],
    ]);

    ctx.reply('Master~ Here are the admin options you requested:', adminButtons);
});

bot.action('view_users', (ctx) => {
    if (ctx.from.id !== adminId) return;

    if (users.length === 0) {
        return ctx.reply('No users have accessed the bot yet, my dear.');
    }

    const userList = users.map(user => `ID: ${user.id}, Username: ${user.username}`).join('\n');
    ctx.reply(`Here’s a list of all users:\n${userList}`);
});

bot.command('ban', (ctx) => {
    const userId = parseInt(ctx.message.text.split(' ')[1]);
    if (!userId || ctx.from.id !== adminId) return;

    bannedUsers.add(userId);
    ctx.reply(`Oh no~ User ${userId} has been banned.`);
});

bot.command('unban', (ctx) => {
    const userId = parseInt(ctx.message.text.split(' ')[1]);
    if (!userId || ctx.from.id !== adminId) return;

    bannedUsers.delete(userId);
    ctx.reply(`Yay! User ${userId} is no longer banned.`);
});

bot.launch();
const PORT = process.env.PORT || Math.floor(Math.random() * (9000 - 1000 + 1)) + 1000;
require('http').createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('UP AND GRATEFUL');
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404: Not Found');
    }
}).listen(PORT, () => console.log(`🌐 HTTP Server is running on port ${PORT}`));