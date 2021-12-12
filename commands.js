const { REST } = require("@discordjs/rest")
const { Routes } = require("discord-api-types/v9")
const rest = new REST({ version: "9" }).setToken(process.env.DISCORD_BOT_TOKEN)

const { Client, Intents } = require("discord.js")
const { SlashCommandBuilder } = require("@discordjs/builders")
const client = new Client({ intents: [Intents.FLAGS.GUILDS] })

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

// https://discordjs.guide/popular-topics/builders.html#slash-command-builders
const commands = [
  new SlashCommandBuilder()
    .setName("blacklist")
    .setDescription("add or remove streamers from blacklist")
    .addSubcommand((subcommand) => {
      return subcommand
        .setName("add")
        .setDescription("add a twitch streamer to blacklist")
        .addStringOption((option) => {
          return option
            .setName("username")
            .setDescription("twitch username")
            .setRequired(true)
        })
    })
    .addSubcommand((subcommand) => {
      return subcommand
        .setName("remove")
        .setDescription("remove a twitch streamer from blacklist")
        .addStringOption((option) => {
          return option
            .setName("username")
            .setDescription("twitch username")
            .setRequired(true)
        })
    }),
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

  let userRoles = interaction.member.roles.cache
  let whitelistedRoles = process.env.DISCORD_ROLE_IDS.split(",")
  if (!userRoles.some((role) => whitelistedRoles.includes(role.id))) {
    await interaction.reply("you do not have permission to use this command")
    return
  }

  let options = interaction.options
  if (interaction.commandName === "blacklist") {
    let username = options.getString("username").toLowerCase()
    let blacklisted
    let message
    if (options.getSubcommand() == "add") {
      blacklisted = true
      message = `added ${username} to twitch streamer blacklist`
    } else if (options.getSubcommand() == "remove") {
      blacklisted = false
      message = `removed ${username} from twitch streamer blacklist`
    }
    await prisma.twitchUser.upsert({
      where: { username },
      update: { blacklisted },
      create: { username, blacklisted },
    })
    await interaction.reply(message)
  }
})

client.login(process.env.DISCORD_BOT_TOKEN)

exports.client = client
