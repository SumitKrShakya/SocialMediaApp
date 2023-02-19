const Post = require('../models/Post');
const User = require('../models/User');

exports.createPost = async(req, res) => {
    try {
        const newPostData = {
            caption: req.body.caption,
            image: {
                public_id: req.body.public_id,
                url: req.body.url
            },
            owner: req.user._id
        };
        const post = await Post.create(newPostData)
        const user = await User.findById(req.user._id)
        user.posts.push(post._id)
        await user.save()
        res.status(201).json({
            success: true,
            post
        })
    } catch {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

exports.deletePost = async(req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            })
        }
        if (post.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'You are not authorized to delete this post'
            })
        }
        await post.remove()

        const user = await User.findById(req.user._id)
        const index = user.posts.indexOf(req.params.id)
        user.posts.splice(index, 1)
        await user.save()


        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        })
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}


exports.likeAndUnlikePost = async(req, res) => {
    try {
        const post = await Post.findById(req.params.id)

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            })
        }

        // Check if the post is already liked
        if (post.likes.includes(req.user._id)) {
            const index = post.likes.indexOf(req.user._id)
            post.likes.splice(index, 1)
            await post.save()
            return res.status(200).json({
                success: true,
                message: 'Post Unliked'
            })
        } else {
            post.likes.push(req.user._id)
            await post.save()
            return res.status(200).json({
                success: true,
                message: 'Post Liked'
            })
        }


    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.getPostsOfFollowing = async(req, res) => {
    try {
        const user = await User.findById(req.user._id)
        const posts = await Post.find({ owner: { $in: user.following } })
        res.status(200).json({
            success: true,
            posts,
        })
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.updateCaption = async(req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            })
        }
        if (post.owner.toString() !== req.user._id.toString()) {
            return res.status(401).json({
                success: false,
                message: 'You are not authorized to update this post'
            })
        }
        post.caption = req.body.caption
        await post.save()
        res.status(200).json({
            success: true,
            message: 'Post updated successfully'
        })
    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.commentOnPost = async(req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            })
        }

        let commentExists = -1
            // Check if the comment already exists
        post.comments.forEach((item, index) => {
            if (item.user.toString() === req.user._id.toString()) {
                commentExists = index
            }
        })

        if (commentExists !== -1) {
            post.comments[commentExists].comment = req.body.comment
            await post.save()
            res.status(201).json({
                success: true,
                message: 'Comment updated successfully'
            })

        } else {
            post.comments.push({
                user: req.user._id,
                comment: req.body.comment
            })

            await post.save()
            res.status(201).json({
                success: true,
                message: 'Comment added successfully'
            })
        }

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}

exports.deleteComment = async(req, res) => {
    try {
        const post = await Post.findById(req.params.id)
        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            })
        }

        // Check if the user is the owner of the post
        if (post.owner.toString() === req.user._id.toString()) {

            if (!req.body.commentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Comment Id is required'
                })
            }

            post.comments.forEach((item, index) => {
                if (item._id.toString() === req.body.commentId.toString()) {
                    return post.comments.splice(index, 1)
                }
            })
            await post.save()
            return res.status(200).json({
                success: true,
                message: 'Selected Comment deleted successfully'
            })

        } else {
            post.comments.forEach((item, index) => {
                if (item.user.toString() === req.user._id.toString()) {
                    return post.comments.splice(index, 1)
                }
            })
            await post.save()
            res.status(200).json({
                success: true,
                message: 'Your Comment deleted successfully'
            })
        }

    } catch (err) {
        res.status(500).json({
            success: false,
            message: err.message
        })
    }
}