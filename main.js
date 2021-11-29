require("dotenv").config()

require("./server.js")
const { client } = require("./commands.js")

const { MessageEmbed } = require("discord.js")
const Database = require("@replit/database")
const db = new Database()
const axios = require("axios")

let guild = null
let channel = null

const BASE_URL = "https://api.twitch.tv/helix"
let authToken = null
let twitchGameID = process.env.TWITCH_GAME_ID

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

  searchForever()
}

async function searchForever() {
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
  streamsResponse.data.data.forEach(async (stream) => {
    let user = await db.get(`twitch_user_${stream.user_login}`)
    let start = new Date(stream.started_at)
    let lastStart = new Date(user?.last_start_at)

    // if this stream is new and not blacklisted:
    let isNewStream = start.getTime() != lastStart.getTime()
    if (user == null || (!user.blacklisted && isNewStream)) {
      // https://discordjs.guide/popular-topics/embeds.html#embed-preview
      let imageURL = stream.thumbnail_url.replace("-{width}x{height}", "")
      let embed = new MessageEmbed()
        .setTitle(stream.title)
        .setURL(`https://www.twitch.tv/${stream.user_login}`)
        .setAuthor(stream.user_name)
        .setImage(imageURL)

      channel.send({ embeds: [embed] })

      console.log(stream)
    }

    await db.set(`twitch_user_${stream.user_login}`, {
      ...user,
      last_start_at: start,
    })
  })

  const MILLISECONDS_TO_MINUTES = 1000 * 60
  setTimeout(searchForever, 1 * MILLISECONDS_TO_MINUTES)
}

main()
