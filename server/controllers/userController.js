import imagekit from "../configs/imagekit.js"
import Connection from "../models/Connection.js"
import User from "../models/User.js"
import fs from 'fs'

// Get User data using userID 
export const getUserData = async (req, res) => {
    try {
        const { userId } = req.auth
        const user = await User.findById(userId)
        if (!user) {
            return res.json({ success: false, message: 'User not found' })
        }
        return res.json({ success: true, user })
    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Update User data 
export const updateUserData = async (req, res) => {
    try {
        const { userId } = req.auth
        let { username, bio, location, full_name } = req.body

        const tempUser = await User.findById(userId)

        !username && (username == tempUser.username)

        if (tempUser.username != username) {
            const user = await User.findOne({ username })
            if (user) {
                username = tempUser.username
            }
        }

        const updatedData = {
            username,
            bio,
            location,
            full_name
        }

        const profile = req.files.profile && req.files.profile[0]
        const cover = req.files.cover && req.files.cover[0]

        if (profile) {
            const buffer = fs.readFileSync(profile.path)
            const response = await imagekit.upload({
                file: buffer,
                fileName: profile.originalname,

            })

            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '512' }
                ]
            })

            updatedData.profile_picture = url
        }

        if (cover) {
            const buffer = fs.readFileSync(cover.path)
            const response = await imagekit.upload({
                file: buffer,
                fileName: cover.originalname,

            })

            const url = imagekit.url({
                path: response.filePath,
                transformation: [
                    { quality: 'auto' },
                    { format: 'webp' },
                    { width: '1280' }
                ]
            })

            updatedData.cover_photo = url
        }

        const user = await User.findByIdAndUpdate(userId, updatedData, { new: true })

        res.json({ success: true, user, message: 'Profile Updated Successfully' })

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Find user using username,loc,email,name
export const discoverUser = async (req, res) => {
    try {
        const { userId } = req.auth
        const { input } = req.body

        const allUsers = await User.find({
            $or: [
                { username: new RegExp(input, 'i') },
                { email: new RegExp(input, 'i') },
                { full_name: new RegExp(input, 'i') },
                { location: new RegExp(input, 'i') },
            ]
        })

        const filteredUsers = allUsers.filter(user => user._id != userId)

        res.json({ success: true, users: filteredUsers })

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Follow User 
export const followUser = async (req, res) => {
    try {
        const { userId } = req.auth
        const { id } = req.body

        const user = await User.findById(userId)

        if (user.following.includes(id)) {
            res.json({ success: false, message: 'You are already following this user' })
        }

        user.following.push(id)
        await user.save()

        const toUser = await User.findById(id)
        toUser.followers.push(userId)

        await toUser.save()

        res.json({ success: true, message: 'Now following this user' })

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Unfollow User 
export const unfollowUser = async (req, res) => {
    try {
        const { userId } = req.auth
        const { id } = req.body


        const user = await User.findById(userId)
        // ID CHECK USER
        user.following = user.following.filter(user => user != id)
        await user.save()

        const toUser = await User.findById(id)
        toUser.followers = toUser.followers.filter(user => user != id)
        await toUser.save()

        res.json({ success: true, message: 'no longer following this user' })

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Send Connection Req

export const sendConnectionReq = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { id } = req.body

        // 20 req per day 

        const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const connectionRequests = await Connection.find({ from_user_id: userId, createdAt: { $gt: last24Hours } })
        if (connectionRequests.length >= 20) {
            return res.json({ success: false, message: 'Sent more than 20 in a day' })
        }

        // Check if Already connected 

        const connection = await Connection.findOne({
            $or: [
                { from_user_id: userId, to_user_id: id },
                { from_user_id: id, to_user_id: userId },
            ]
        })

        if (!connection) {
            await connection.create({
                from_user_id: userId,
                to_user_id: id,
            })
            return res.json({ success: true, message: 'Request sent Successfully' })
        } else if (connection && connection.status === 'accepted') {
            return res.json({ success: false, message: 'Already connected' })
        }
        return res.json({ success: false, message: 'Request Pending' })

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Get user Connections
export const getUserConnections = async (req, res) => {
    try {
        const { userId } = req.auth()
        const user = await User.findById(userId).populate('connections followers following')

        const connections = user.connections
        const followers = user.followers
        const following = user.following

        const pendingConnections = await Connection.find({ to_user_id: userId, status: 'pending' }).populate('from_user_id').mp(connection => connection.from_user_id)

        return res.json({ success: true, connections, followers, following, pendingConnections })

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}

// Accept Connection
export const acceptConnectionReq = async (req, res) => {
    try {
        const { userId } = req.auth()
        const { id } = req.body

        const connection = await Connection.findOne({ from_user_id: id, to_user_id: userId })

        if (!connection) {
            return res.json({ success: false, message: error.message })
        }

        const user = await User.findById(userId)
        user.connections.push(id)
        await user.save()

        const toUser = await User.findById(id)
        toUser.connections.push(userId)
        await toUser.save()

        connection.status = 'accepted'
        await connection.save()

        return res.json({ success: true, message: 'Connection Accepted' })

    } catch (error) {
        console.log(error)
        return res.json({ success: false, message: error.message })
    }
}