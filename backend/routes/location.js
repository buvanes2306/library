import express from 'express'
import Book from '../models/Book.js'

const router = express.Router()

/*
GET /api/locations

Returns:
[
  {
    rack: 1,
    shelves: [4, 5, 7, 59, 60]
  },
  {
    rack: 2,
    shelves: [1, 4, 5, 27, 34, 35]
  }
]
*/
router.get("/", async (req, res) => {
  try {
    const locations = await Book.aggregate([
      {
        $match: {
          locationRack: { $ne: null },
          shelf: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$locationRack",
          shelves: { $addToSet: "$shelf" }
        }
      },
      {
        $project: {
          _id: 0,
          rack: "$_id",
          shelves: { $sortArray: { input: "$shelves", sortBy: 1 } }
        }
      },
      {
        $sort: { rack: 1 }
      }
    ])

    res.json(locations)
  } catch (error) {
    console.error("Get locations error:", error)
    res.status(500).json({ message: error.message })
  }
})

export default router
