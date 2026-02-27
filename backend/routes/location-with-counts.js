import express from 'express'
import Book from '../models/Book.js'

const router = express.Router()

/*
GET /api/locations-with-counts

Returns:
[
  {
    rack: 1,
    shelves: [
      { shelf: 4, bookCount: 28 },
      { shelf: 5, bookCount: 15 },
      { shelf: 7, bookCount: 32 },
      { shelf: 59, bookCount: 8 },
      { shelf: 60, bookCount: 12 }
    ],
    totalBooks: 95
  },
  {
    rack: 2,
    shelves: [
      { shelf: 1, bookCount: 22 },
      { shelf: 4, bookCount: 18 },
      { shelf: 5, bookCount: 31 },
      { shelf: 27, bookCount: 7 },
      { shelf: 34, bookCount: 14 },
      { shelf: 35, bookCount: 9 }
    ],
    totalBooks: 101
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
          _id: {
            rack: "$locationRack",
            shelf: "$shelf"
          },
          bookCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: "$_id.rack",
          shelves: {
            $push: {
              shelf: "$_id.shelf",
              bookCount: "$bookCount"
            }
          },
          totalBooks: { $sum: "$bookCount" }
        }
      },
      {
        $project: {
          _id: 0,
          rack: "$_id",
          shelves: {
            $sortArray: { 
              input: "$shelves", 
              sortBy: { shelf: 1 } 
            }
          },
          totalBooks: 1
        }
      },
      {
        $sort: { rack: 1 }
      }
    ])

    res.json(locations)
  } catch (error) {
    console.error("Get locations with counts error:", error)
    res.status(500).json({ message: error.message })
  }
})

export default router
