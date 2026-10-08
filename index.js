import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";

import dotenv from "dotenv";

const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";

dotenv.config({ path: envFile });

const app = express();
const PORT = process.env.PORT || 2123;
const JWT_SECRET = process.env.JWT_SECRET;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(
  /\/$/,
  "",
);
// ==============================
// MIDDLEWARE
// ==============================

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());

// ==============================
// FILE UPLOADS
// ==============================

const uploadDir = "./uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ==============================
// DATABASE
// ==============================

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.DB_SSL === "true"
      ? process.env.DB_CA
        ? { ca: process.env.DB_CA.replace(/\\n/g, "\n") }
        : { rejectUnauthorized: false }
      : undefined,
});

// ==============================
// DATABASE INITIALIZATION
// ==============================

const initDB = async () => {
  try {
    // ==============================
    // USERS
    // ==============================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        role VARCHAR(20) DEFAULT 'student',
        bio TEXT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add avatar
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN avatar VARCHAR(255) DEFAULT NULL
      `);
    } catch {}

    // Add role
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN role VARCHAR(20) DEFAULT 'student'
      `);
    } catch {}

    // Add bio
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN bio TEXT DEFAULT NULL
      `);
    } catch {}

    // Add course
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN course_id INT DEFAULT NULL
      `);
    } catch {}

    // Add payment status
    try {
      await pool.query(`
        ALTER TABLE users
        ADD COLUMN payment_status VARCHAR(20) DEFAULT 'unpaid'
      `);
    } catch {}

    // ==============================
    // FOUNDER
    // ==============================

    try {
      await pool.query(`
        UPDATE users
        SET
          role = 'founder',
          bio = 'Building a technology learning environment where creativity, practical skills and innovation come together.'
        WHERE email = 'firaolnegewo8@gmail.com'
      `);

      console.log("Founder updated successfully");
    } catch (error) {
      console.error("Founder update failed:", error);
    }

    // ==============================
    // MANAGER
    // ==============================

    try {
      await pool.query(`
        UPDATE users
        SET
          role = 'manager',
          bio = 'Building a technology learning environment where creativity, practical skills and innovation come together.'
        WHERE email = 'firaolnegewo9@gmail.com'
      `);

      console.log("Manager updated successfully");
    } catch (error) {
      console.error("Manager update failed:", error);
    }

    // ==============================
    // CONTACT TABLE
    // ==============================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ==============================
    // MAJOR COURSES
    // ==============================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        course_id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        material_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        class_price DECIMAL(10,2) NOT NULL DEFAULT 0
      )
    `);

    // ==============================
    // MINOR COURSES
    // ==============================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS minor_courses (
        minor_course_id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        FOREIGN KEY (course_id)
          REFERENCES courses(course_id)
          ON DELETE CASCADE
          ON UPDATE CASCADE,
        UNIQUE (course_id, title)
      )
    `);

    // ==============================
    // MAJOR COURSE DATA
    // ==============================

    await pool.query(`
      INSERT INTO courses
        (title, description, material_price, class_price)
      VALUES
        (
          'Full-Stack Development',
          'Learn frontend, backend, database and API development.',
          10000,
          15000
        ),
        (
          'Mobile App Development',
          'Learn how to design and build modern mobile applications.',
          5000,
          10000
        ),
        (
          'UI/UX Design',
          'Learn user interface and user experience design principles.',
          5000,
          12000
        )
      ON DUPLICATE KEY UPDATE
        description = VALUES(description),
        material_price = VALUES(material_price),
        class_price = VALUES(class_price)
    `);

    // ==============================
    // GET COURSE IDS
    // ==============================

    const [courses] = await pool.query(`
      SELECT course_id, title
      FROM courses
    `);

    const courseIds = {};

    courses.forEach((course) => {
      courseIds[course.title] = course.course_id;
    });

    // ==============================
    // MINOR COURSE DATA
    // ==============================

    await pool.query(
      `
      INSERT INTO minor_courses
        (course_id, title, description)
      VALUES

        (?, 'Basic Computer Skill', 'Learn the basic of Computers.'),
        (?, 'HTML', 'Learn the structure and semantic elements of modern websites.'),
        (?, 'CSS', 'Learn styling.'),
        (?, 'Bootstrap', 'Build responsive interfaces using Bootstrap.'),
        (?, 'JavaScript', 'Learn programming and interactive web development.'),
        (?, 'React.js', 'Build modern user interfaces with React.'),
        (?, 'Node.js & Express.js', 'Build backend applications and REST APIs.'),
        (?, 'Database & MySQL', 'Learn relational databases and SQL.'),
        (?, 'REST API', 'Learn how frontend and backend applications communicate.'),
        (?, 'Full-Stack Project', 'Build a complete full-stack web application.'),

        (?, 'Programming Fundamentals', 'Learn the fundamental concepts of programming.'),
        (?, 'Mobile UI Design', 'Learn how to design interfaces for mobile applications.'),
        (?, 'React Native', 'Build cross-platform mobile applications with React Native.'),
        (?, 'Navigation', 'Learn navigation between screens in mobile applications.'),
        (?, 'API Integration', 'Connect mobile applications with backend APIs.'),
        (?, 'Authentication', 'Implement login and user authentication in mobile apps.'),
        (?, 'Local Storage', 'Store application data locally on mobile devices.'),
        (?, 'Mobile App Project', 'Build and complete a real-world mobile application.'),

        (?, 'Design Fundamentals', 'Learn the fundamental principles of digital design.'),
        (?, 'Color Theory', 'Learn how to use colors effectively in digital interfaces.'),
        (?, 'Typography', 'Learn typography and font selection for interfaces.'),
        (?, 'User Research', 'Learn how to understand users and their needs.'),
        (?, 'Wireframing', 'Create wireframes for websites and applications.'),
        (?, 'Figma', 'Learn to design digital interfaces using Figma.'),
        (?, 'Prototyping', 'Create interactive prototypes for digital products.'),
        (?, 'UI/UX Project', 'Apply UI/UX skills to a complete design project.')

      ON DUPLICATE KEY UPDATE
        description = VALUES(description)
      `,
      [
        // Full-Stack
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],
        courseIds["Full-Stack Development"],

        // Mobile
        courseIds["Mobile App Development"],
        courseIds["Mobile App Development"],
        courseIds["Mobile App Development"],
        courseIds["Mobile App Development"],
        courseIds["Mobile App Development"],
        courseIds["Mobile App Development"],
        courseIds["Mobile App Development"],
        courseIds["Mobile App Development"],

        // UI/UX
        courseIds["UI/UX Design"],
        courseIds["UI/UX Design"],
        courseIds["UI/UX Design"],
        courseIds["UI/UX Design"],
        courseIds["UI/UX Design"],
        courseIds["UI/UX Design"],
        courseIds["UI/UX Design"],
        courseIds["UI/UX Design"],
      ],
    );

    console.log("Courses database ready");
    console.log("Users table ready");
  } catch (error) {
    console.error("Database error:", error.message);
  }
};

// ==============================
// PASSWORD
// ==============================

const saltRounds = 10;

// ==============================
// CONTACT MESSAGES
// ==============================

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    await pool.query(
      `
      INSERT INTO contact_messages
        (name, email, subject, message)
      VALUES (?, ?, ?, ?)
      `,
      [name, email, subject, message],
    );

    res.status(201).json({
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Contact message error:", error);

    res.status(500).json({
      message: "Failed to save contact message",
    });
  }
});

// ==============================
// SIGN UP
// ==============================

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const [existing] = await pool.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existing.length) {
      return res.status(400).json({
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      `
      INSERT INTO users
        (username, email, password)
      VALUES (?, ?, ?)
      `,
      [username, email, hashedPassword],
    );

    res.status(201).json({
      message: "User registered successfully!",
    });
  } catch (error) {
    res.status(500).json({
      error: "Server error during registration",
      details: error.message,
    });
  }
});

// ==============================
// SIGN IN
// ==============================

app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (!users.length) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "24h",
      },
    );

    res.json({
      message: "Login successful!",
      token,

      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        course_id: user.course_id,
        payment_status: user.payment_status,
      },
    });
  } catch (error) {
    res.status(500).json({
      error: "Server error during login",
      details: error.message,
    });
  }
});

// ==============================
// FOUNDER
// ==============================

app.get("/api/founder", async (req, res) => {
  try {
    const [founders] = await pool.query(`
      SELECT
        id,
        username AS name,
        bio,
        avatar
      FROM users
      WHERE role = 'founder'
      LIMIT 1
    `);

    if (!founders.length) {
      return res.status(404).json({
        message: "Founder not found",
      });
    }

    const founder = founders[0];

    if (founder.avatar) {
      founder.avatar = `${BASE_URL}/${founder.avatar}`;
    }

    res.json(founder);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// ==============================
// UPDATE AVATAR
// ==============================

app.post(
  "/api/user/update-avatar",
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "No image file provided.",
        });
      }

      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          message: "Unauthorized.",
        });
      }

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, JWT_SECRET);

      const avatarPath = `uploads/${req.file.filename}`;

      await pool.query("UPDATE users SET avatar = ? WHERE id = ?", [
        avatarPath,
        decoded.id,
      ]);

      res.json({
        message: "Avatar updated successfully",
        avatarPath,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to update avatar",
      });
    }
  },
);

// ==============================
// STUDENTS
// ==============================

app.get("/api/students", async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT
        u.id,
        u.username AS name,
        u.email,
        u.course_id,
        u.payment_status,
        c.title AS dep,
        'JunBatch' AS year,
        1 AS joined,
        1 AS finished,
        2 AS onGoing,

        CASE
          WHEN u.avatar IS NOT NULL
          THEN CONCAT('${BASE_URL}/', u.avatar)

          ELSE 'https://plus.unsplash.com/premium_photo-1677252438411-9a930d7a5168?w=500'
        END AS avatar

      FROM users u

      LEFT JOIN courses c
        ON u.course_id = c.course_id

      WHERE u.role = 'student'
    `);

    res.json(students);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
});

// ==============================
// COURSES
// ==============================

app.get("/api/courses", async (req, res) => {
  try {
    const [courses] = await pool.query(`
      SELECT
        course_id,
        title,
        description,
        material_price,
        class_price
      FROM courses
      ORDER BY course_id
    `);

    res.json(courses);
  } catch (error) {
    console.error("Courses error:", error);

    res.status(500).json({
      error: "Failed to fetch courses",
    });
  }
});

// ==============================
// GET COURSES OF ONE STUDENT (Single clean route)
// ==============================
// ==============================
// GET COURSES OF ONE STUDENT
// ==============================

// ==============================
// GET COURSES OF ONE STUDENT
// ==============================

app.get("/api/students/:id/courses", async (req, res) => {
  try {
    const studentId = Number(req.params.id);

    if (!studentId || isNaN(studentId)) {
      return res.status(400).json({
        error: "Invalid student ID",
      });
    }

    const [courses] = await pool.query(
      `
      SELECT
        c.course_id,
        c.title,
        c.description,
        c.material_price,
        c.class_price,
        u.payment_status
      FROM users u
      LEFT JOIN courses c
        ON u.course_id = c.course_id
      WHERE u.id = ?
      `,
      [studentId]
    );

    const filteredCourses = courses.filter((row) => row.course_id !== null);
    res.json(filteredCourses);
  } catch (error) {
    console.error("❌ Student courses error:", error);

    res.status(500).json({
      error: "Failed to fetch student courses",
      details: error.message,
    });
  }
});
// ==============================
// MINOR COURSES BY MAJOR COURSE ID
// ==============================

app.get("/api/courses/:courseId/minor-courses", async (req, res) => {
  try {
    const { courseId } = req.params;

    const [minorCourses] = await pool.query(
      `
      SELECT
        minor_course_id,
        course_id,
        title,
        description
      FROM minor_courses
      WHERE course_id = ?
      ORDER BY minor_course_id
      `,
      [courseId],
    );

    res.json(minorCourses);
  } catch (error) {
    console.error("Minor courses error:", error);

    res.status(500).json({
      error: "Failed to fetch minor courses",
    });
  }
});

// ==============================
// MANAGER STUDENTS
// ==============================

app.get("/api/manager/students", async (req, res) => {
  try {
    const [students] = await pool.query(`
      SELECT
        u.id,
        u.username AS name,
        u.email,
        u.course_id,
        c.title AS course,
        u.payment_status

      FROM users u

      LEFT JOIN courses c
        ON u.course_id = c.course_id

      WHERE u.role = 'student'

      ORDER BY u.id DESC
    `);

    res.json(students);
  } catch (error) {
    console.error("Manager students error:", error);

    res.status(500).json({
      error: "Failed to fetch student information",
    });
  }
});

// ==============================
// MANAGER PAYMENT APPROVAL
// ==============================

app.put("/api/manager/payment/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await pool.query(
      `
      UPDATE users
      SET payment_status = 'paid'
      WHERE id = ?
      `,
      [userId],
    );

    res.json({
      message: "Payment approved successfully",
    });
  } catch (error) {
    console.error("Payment approval error:", error);

    res.status(500).json({
      error: "Failed to approve payment",
    });
  }
});

// ==============================
// SAVE USER COURSE
// ==============================

app.put("/api/user/course", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const userId = decoded.id;

    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        error: "Course ID is required",
      });
    }

    const [courses] = await pool.query(
      `
      SELECT course_id
      FROM courses
      WHERE course_id = ?
      `,
      [courseId],
    );

    if (!courses.length) {
      return res.status(404).json({
        error: "Course not found",
      });
    }

    await pool.query(
      `
      UPDATE users
      SET course_id = ?
      WHERE id = ?
      `,
      [courseId, userId],
    );

    res.json({
      message: "Course selected successfully",
      course_id: Number(courseId),
    });
  } catch (error) {
    console.error("Course selection error:", error);

    res.status(500).json({
      error: "Failed to save course",
    });
  }
});

// ==============================
// START SERVER
// ==============================

const startServer = async () => {
  await initDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();
