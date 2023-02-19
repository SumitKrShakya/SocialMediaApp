const User = require('../models/User')
const Post = require('../models/Post')
const { sendEmail } = require('../middlewares/sendEmail')
const crypto = require('crypto')

exports.register = async(req, res) => {
    try {
        const { name, email, password } = req.body
        let user = await User.findOne({
            email
        })

        if (user) {
            return res.status(400).json({
                success: false,
                message: "User already exists"
            })
        }

        user = await User.create({
            name,
            email,
            password,
            avatar: { public_id: "sample_id", url: "sample_url" }
        })

        const token = await user.generateToken()

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true
        }

        res.status(201).cookie('token', token, options).json({
            success: true,
            user,
            token
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.login = async(req, res) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email }).select('+password')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }


        const isMatch = await user.matchPasswords(password)


        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect password"
            })
        }

        const token = await user.generateToken()

        const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true
        }

        res.status(200).cookie('token', token, options).json({
            success: true,
            user,
            token
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.logout = async(req, res) => {
    try {
        res.status(200)
            .cookie('token', null, {
                expires: new Date(Date.now()),
                httpOnly: true
            })
            .json({
                success: true,
                message: "Logged out"
            })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


exports.followUser = async(req, res) => {
    try {
        const userToFolow = await User.findById(req.params.id)
        const loggedInUser = await User.findById(req.user._id)

        if (!userToFolow) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        if (userToFolow._id.toString() === loggedInUser._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot follow yourself"
            })
        }

        if (loggedInUser.following.includes(userToFolow._id)) {
            const indexOfFollower = loggedInUser.following.indexOf(userToFolow._id)
            loggedInUser.following.splice(indexOfFollower, 1)
            const indexOfFollowing = userToFolow.followers.indexOf(loggedInUser._id)
            userToFolow.followers.splice(indexOfFollowing, 1)

            await loggedInUser.save()
            await userToFolow.save()

            return res.status(200).json({
                success: true,
                message: "User unfollowed successfully"
            })

        }

        loggedInUser.following.push(userToFolow._id)
        userToFolow.followers.push(loggedInUser._id)

        await loggedInUser.save()
        await userToFolow.save()

        res.status(200).json({
            success: true,
            message: "User followed successfully"
        })


    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.updatePassword = async(req, res) => {
    try {
        const user = await User.findById(req.user._id).select('+password')
        const { oldPassword, newPassword } = req.body
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Please enter old and new password"
            })
        }
        const isMatch = await user.matchPasswords(oldPassword)
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Incorrect old password"
            })
        }
        user.password = newPassword
        await user.save()
        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.updateProfile = async(req, res) => {
    try {
        const user = await User.findById(req.user._id)
        const { name, email } = req.body

        if (name) {
            user.name = name
        }
        if (email) {
            user.email = email
        }
        await user.save()
        res.status(200).json({
            success: true,
            message: "Profile updated successfully"
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.deleteMyProfile = async(req, res) => {
    try {
        const user = await User.findById(req.user._id)
        const posts = user.posts
        const followers = user.followers
        const followings = user.following
        const userId = user._id
        await user.remove()

        // logout user after deleting profile
        res.cookie('token', null, {
            expires: new Date(Date.now()),
            httpOnly: true
        })

        // Delete all posts of the user
        for (let i = 0; i < posts.length; i++) {
            const post = await Post.findById(posts[i])
            await post.remove()
        }

        // Removing users from follower's following 
        for (let i = 0; i < followers.length; i++) {
            const follower = await User.findById(followers[i])
            const index = follower.followers.indexOf(userId)
            follower.following.splice(index, 1)
            await follower.save()
        }

        // Removing users from following' followers
        for (let i = 0; i < followers.length; i++) {
            const following = await User.findById(followings[i])
            const index = following.followers.indexOf(userId)
            following.followers.splice(index, 1)
            await following.save()
        }


        res.status(200).json({
            success: true,
            message: "Profile deleted successfully"
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}


exports.myProfile = async(req, res) => {
    try {
        console.log(req.user)
        const user = await User.findById(req.user._id).populate('posts')
        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.getUserProfile = async(req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('posts')

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }

        res.status(200).json({
            success: true,
            user
        })
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.getAllUsers = async(req, res) => {
    try {
        console.log("hello")
        const users = await User.find({})
        res.status(200).json({
            success: true,
            users
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.forgotPassword = async(req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            })
        }
        const resetPasswordToken = await user.getResetPasswordToken()

        await user.save()
        const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetPasswordToken}`
        const message = `You are receiving this email because you (or someone else) has requested the reset of a passwor.\n\nReset you password by clicking the link below: \n\n ${resetUrl}`
        try {
            await sendEmail({
                email: user.email,
                subject: "Password Reset",
                message
            })
            res.status(200).json({
                success: true,
                message: `Email sent to ${user.email}`
            })
        } catch (error) {
            user.resetPasswordToken = undefined
            user.resetPasswordExpire = undefined
            await user.save()
            return res.status(500).json({
                success: false,
                message: error.message
            })
        }



    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.resetPassword = async(req, res) => {
    try {
        console.log(req.params.token)
        const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex')
        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        })
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Token is invalid or has expired"
            })
        }

        user.password = req.body.password
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined
        await user.save()

        res.status(200).json({
            success: true,
            message: "Password updated successfully"
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}