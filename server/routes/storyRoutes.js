import express from 'express'
import { protect } from '../middlewares/auth.js'
import { upload } from '../configs/multer.js'
import { addUserStory, getUserStory } from '../controllers/storyController.js'

const storyRouter = express.Router()

storyRouter.post('/create', upload.single('media'), protect, addUserStory)
storyRouter.get('/feed', protect, getUserStory)

export default storyRouter