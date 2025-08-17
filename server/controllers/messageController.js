import fs from 'fs'
import imagekit from '../configs/imagekit.js'
import Message from '../models/Message.js'

// create empty obj to store server side event connections
const connections = {}

// Controller function for server side event endpoint 
export const sseController = (req, res) => {
    const { userId } = req.params
    console.log('new client connected: ', userId)

    // set SSE headers 
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', ' ')

    // add client response obj to the connections obj 
    connections[userId] = res

    // Send an initial event to client
    res.write('log:Connected to server side stream\n\n')

    // handle discconnection 
    res.on('close', () => {
        // remove client object from array 
        delete connections[userId]
        console.log('client disconnedted')
    })
}

// Send Message 
export const sendMessage = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { to_user_id, text } = req.body
        const image = req.file

        let media_url = ''

        let message_type = image ? 'image' : 'text'

        if (message_type === 'image') {
            const fileBuffer = fs.readFileSync(image.path)
            const response = await imagekit.upload({
                file: fileBuffer,
                fileName: image.originalname
            })
            media_url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '1280' },
                ]
            })
        }

        const message = await Message.create({
            from_user_id: userId,
            to_user_id,
            text,
            message_type,
            media_url,
        })

        res.json({ success: false, message })

        // Send message to to user id using sse 
        const messageWithUserData = await Message.findById(message._id).populate('from_user_id')

        if (connections[to_user_id]) {
            connections[to_user_id].write(`data: ${JSON.stringify(messageWithUserData)}\n\n`)
        }

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Get Chat Message 
export const getChatMessage = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { to_user_id, text } = req.body
        const messages = await Message.find({
            $or: [
                { from_user_id: userId, to_user_id },
                { from_user_id: to_user_id, to_user_id: userId },
            ]
        }).sort({ createdAt: -1 })

        //Mark message as seen
        await Message.updatMany({ from_user_id: to_user_id, to_user_id: userId }, { seen: true })

        res.json({ success: false, messages })


    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Get recent Message 
export const getuserRecentMessages = async (req, res) => {
    try {
        const { userId } = req.auth()
        const messages = await Message.find({ to_user_id: userId }).populate('from_user_id to_user_id').sort({ createdAt: -1 })

        res.json({ success: false, messages })


    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}