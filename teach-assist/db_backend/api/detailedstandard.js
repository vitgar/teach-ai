const express = require('express');
const router = express.Router();
const DetailedStandard = require('../models/DetailedStandard');
const { isAuthenticated } = require('../middleware/auth');

// @route   GET /api/detailedstandards
// @desc    Get detailed standards with optional grade level filter
// @access  Private
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const { gradeLevel } = req.query;
    console.log('Fetching detailed standards for grade level:', gradeLevel);
    
    const query = gradeLevel ? { gradeLevel } : {};
    console.log('Query:', query);
    
    const standards = await DetailedStandard.aggregate([
      { $match: query },
      {
        $addFields: {
          standardNum: { $arrayElemAt: [{ $split: ["$standard", "."] }, 1] },
          standardGrade: {
            $cond: {
              if: { $eq: [{ $arrayElemAt: [{ $split: ["$standard", "."] }, 0] }, "K"] },
              then: 0,  // Treat K as grade 0 for sorting
              else: {
                $convert: {
                  input: { $arrayElemAt: [{ $split: ["$standard", "."] }, 0] },
                  to: "int",
                  onError: 0  // Default to 0 if conversion fails
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          standardNumber: { 
            $convert: {
              input: {
                $reduce: {
                  input: { $range: [0, { $strLenCP: "$standardNum" }] },
                  initialValue: "",
                  in: {
                    $concat: [
                      "$$value",
                      {
                        $cond: {
                          if: { $regexMatch: { input: { $substr: ["$standardNum", "$$this", 1] }, regex: /[0-9]/ } },
                          then: { $substr: ["$standardNum", "$$this", 1] },
                          else: ""
                        }
                      }
                    ]
                  }
                }
              },
              to: "int",
              onError: 0  // Default to 0 if conversion fails
            }
          },
          standardLetter: {
            $reduce: {
              input: { $range: [0, { $strLenCP: "$standardNum" }] },
              initialValue: "",
              in: {
                $concat: [
                  "$$value",
                  {
                    $cond: {
                      if: { $regexMatch: { input: { $substr: ["$standardNum", "$$this", 1] }, regex: /[A-Z]/ } },
                      then: { $substr: ["$standardNum", "$$this", 1] },
                      else: ""
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $sort: {
          standardGrade: 1,
          standardNumber: 1,
          standardLetter: 1,
          strand: 1
        }
      }
    ]);
    
    console.log(`Found ${standards.length} detailed standards`);
    res.json(standards);
  } catch (error) {
    console.error('Error fetching detailed standards:', error);
    res.status(500).json({ error: 'Error fetching standards' });
  }
});

module.exports = router; 