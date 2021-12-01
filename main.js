require("dotenv").config()

require("./server.js")
const { client } = require("./commands.js")

const { MessageEmbed } = require("discord.js")
const axios = require("axios")

const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()

let guild = null
let channel = null

const BASE_URL = "https://api.twitch.tv/helix"
let authToken = null
let twitchGameID = process.env.TWITCH_GAME_ID

const MINUTES_IN_MILLISECONDS = 1000 * 60

async function main() {
  guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID)
  channel = await guild.channels.fetch(process.env.DISCORD_CHANNEL_ID)

  let tokenResponse = await axios.post(`https://id.twitch.tv/oauth2/token`, {
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  })
  authToken = tokenResponse.data.access_token

  if (twitchGameID == null) {
    // https://dev.twitch.tv/docs/api/reference#get-games
    let gamesResponse = await axios.get(`${BASE_URL}/games?name=Audica`, {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${authToken}`,
      },
    })
    console.log(gamesResponse.data)
    twitchGameID = gamesResponse.data[0].id
  }

  search()
}

function getTwitchURL(username) {
  return `https://www.twitch.tv/${username}`
}

async function search() {
  // https://dev.twitch.tv/docs/api/reference#get-streams
  let streamsResponse = await axios.get(
    `${BASE_URL}/streams?game_id=${twitchGameID}`,
    {
      headers: {
        "Client-ID": process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${authToken}`,
      },
    }
  )
  let streams = streamsResponse.data.data
  let completedCount = 0

  console.log(`${streams.length} streams found`)
  if (streams.length == 0) {
    await markEndedStreams(streams)
    return
  }

  streams.forEach(async (stream, index) => {
    let username = stream.user_login
    let user = await prisma.twitchUser.findUnique({ where: { username } })
    let streamStart = new Date(stream.started_at)
    let lastStart = new Date(user?.lastStartAt)

    // if this stream is new and not blacklisted:
    let isNewStream = streamStart.getTime() != lastStart.getTime()
    if (user == null || (!user.blacklisted && isNewStream)) {
      // https://discordjs.guide/popular-topics/embeds.html#embed-preview
      let imageURL = stream.thumbnail_url.replace("-{width}x{height}", "")
      let embed = new MessageEmbed()
        .setTitle(stream.title)
        .setURL(getTwitchURL(stream.user_login))
        .setAuthor(stream.user_name)
        .setImage(imageURL)

      channel.send({ embeds: [embed] })

      console.log(stream)
    }

    await prisma.twitchUser.upsert({
      where: { username },
      update: { lastStartAt: streamStart },
      create: {
        username,
        lastStartAt: streamStart,
      },
    })

    completedCount += 1
    if (completedCount == streams.length) {
      await markEndedStreams(streams)
    }
  })
}

async function markEndedStreams(streams) {
  let messages = await channel.messages.fetch()

  messages.forEach(async (message) => {
    if (message.author.id == client.user.id) {
      let reactions = message.reactions.cache

      let url = message.embeds[0].url
      if (
        reactions.every((reaction) => reaction.emoji.name != "🛑") &&
        streams.every((stream) => getTwitchURL(stream.user_login) != url)
      ) {
        await message.react("🛑")
      }
    }
  })

  setTimeout(search, 2 * MINUTES_IN_MILLISECONDS)
}

main()
