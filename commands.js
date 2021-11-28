const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_BOT_TOKEN)

const { Client, Intents } = require("discord.js")
const client = new Client({ intents: [Intents.FLAGS.GUILDS] })

const Database = require("@replit/database")
const db = new Database()

const commands = [
  {
    name: "ping",
    description: "Replies with Pong!",
  },
]

async function register() {
  try {
    console.log("Started refreshing application (/) commands.")

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID,
        process.env.DISCORD_GUILD_ID
      ),
      { body: commands }
    )

    console.log("Successfully reloaded application (/) commands.")
  } catch (error) {
    console.error(error)
  }
}

register()

client.on("debug", console.log)

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong!")
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)

exports.client = client
