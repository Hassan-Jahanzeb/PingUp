import express from 'express'
import { acceptConnectionReq, discoverUser, followUser, getUserConnections, getUserData, getUserProfile, sendConnectionReq, unfollowUser, updateUserData } from '../controllers/userController.js'
import { protect } from '../middlewares/auth.js'
import { upload } from '../configs/multer.js'
import { getuserRecentMessages } from '../controllers/messageController.js'

const userRouter = express.Router()

userRouter.get('/data', protect, getUserData)
userRouter.post('/update', upload.fields([{ name: 'profile', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), protect, updateUserData)
userRouter.post('/discover', protect, discoverUser)
userRouter.post('/follow', protect, followUser)
userRouter.post('/unfollow', protect, unfollowUser)
userRouter.post('/connect', protect, sendConnectionReq)
userRouter.post('/accept', protect, acceptConnectionReq)
userRouter.get('/connections', protect, getUserConnections)
userRouter.post('/profiles', getUserProfile)
userRouter.get('/recent-messages', protect, getuserRecentMessages)


export default userRouter