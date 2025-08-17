import express from 'express'
import { protect } from '../middlewares/auth.js'
import { upload } from '../configs/multer.js'
import { getChatMessage, sendMessage, sseController } from '../controllers/messageController.js'

const messageRouter = express.Router()

messageRouter.get('/:userId', sseController)
messageRouter.post('/send', upload.single('image'), protect, sendMessage)
messageRouter.post('/get', protect, getChatMessage)

export default messageRouter