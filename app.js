import express from 'express';
import hbs from 'hbs';
import db from './src/config/db.js';
import flash from 'express-flash';
import session from 'express-session';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const app = express()
const port = 3000;

app.set('view engine', 'hbs');
app.set('views', 'src/views');

hbs.registerPartials('src/views/partials');
hbs.registerHelper('increment', (value) => {
  return parseInt(value) + 1;
});
hbs.registerHelper('formatDate', (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric'
  });
});
hbs.registerHelper('formatDateInput', (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`; // sesuai format input[type=date]
});

hbs.registerHelper('isChecked', (techList, techName) => {
  if (Array.isArray(techList) && techList.includes(techName)) return 'checked';
  return '';
});

app.use('/assets', express.static('src/assets'));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'YuanGans',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}))
app.use(flash());

const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    res.redirect('/home');
  }
  next();
}

const redirectIfLoggedIn = (req, res, next) => {
  if (req.session.user) {
    res.redirect('/experiences-admin');
  }
  next();
}

const uploadPictureCompany = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/assets/img/upload_company');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadPictureExperience = multer({ storage: uploadPictureCompany });

const uploadPictureProjects = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './src/assets/img/upload_projects');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadLogoPicture = multer({ storage: uploadPictureProjects });

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const dataUser = await db.query(`SELECT * FROM public.user WHERE email='${email}'`);

    if (!dataUser.rows.length) {
      req.flash('error', 'Email not registered');
      return res.redirect('/login');
    }

    if (dataUser.rows[0].password !== password) {
      req.flash('error', 'Passwords do not match');
      return res.redirect('/login');
    }

    req.session.user = {
      name: dataUser.rows[0].name,
    }

    res.redirect('/experiences-admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Login Failed');
  }
});

app.post('/experiences-admin-add', uploadPictureExperience.single('picture-experience'), async (req, res) => {
  const { position, company, start_date, end_date } = req.body;
  const { descriptions, technologies } = req.body;

  try {
    if (!Array.isArray(descriptions)) {
      descriptions = [descriptions];
    }

    if (!Array.isArray(technologies)) {
      technologies = [technologies];
    }

    const jsonDescriptions = JSON.stringify(descriptions);
    const jsonTechnologies = JSON.stringify(technologies);

    const query = `INSERT INTO experiences (position, company, start_date, end_date, description, technologies, company_logo) VALUES ('${position}', '${company}', '${start_date}', '${end_date}', '${jsonDescriptions}', '${jsonTechnologies}', '${req.file.filename}')`;
    await db.query(query)
    req.flash('success', 'Data added successfully');
    res.redirect('/experiences-admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add data');
  }
});

app.post('/experiences-admin/edit/:id', uploadPictureExperience.single('picture-experience'), async (req, res) => {
  try {
    const { id } = req.params;
    const { position, company, start_date, end_date, descriptions, technologies } = req.body;

    const oldData = await db.query(`SELECT * FROM experiences WHERE id = $1`, [id]);
    const oldLogo = oldData.rows[0].company_logo;

    const newLogo = req.file ? req.file.filename : oldLogo;

    const descArray = Array.isArray(descriptions) ? descriptions : [descriptions];
    const techArray = Array.isArray(technologies) ? technologies : [technologies];

    if (req.file && oldLogo) {
      const fs = await import('fs');
      const oldPath = `./src/assets/img/upload_company/${oldLogo}`;
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update data ke database
    const query = `
      UPDATE experiences
      SET 
        position = $1,
        company = $2,
        start_date = $3,
        end_date = $4,
        description = $5::jsonb,
        technologies = $6::jsonb,
        company_logo = $7
      WHERE id = $8
    `;

    await db.query(query, [
      position,
      company,
      start_date,
      end_date,
      JSON.stringify(descArray),
      JSON.stringify(techArray),
      newLogo,
      id
    ]);

    req.flash('success', 'Successfully updated data');
    res.redirect('/experiences-admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update data');
  }
});

app.post('/projects-admin-add', uploadLogoPicture.single('picture-projects'), async (req, res) => {
  const { title, description, demo_url } = req.body;
  const { technologies } = req.body;

  try {
    if (!Array.isArray(technologies)) {
      technologies = [technologies];
    }

    const jsonTechnologies = JSON.stringify(technologies);

    const query = `INSERT INTO projects (title, description, technologies, demo_url, picture) VALUES ('${title}', '${description}', '${jsonTechnologies}', '${demo_url}', '${req.file.filename}')`;
    await db.query(query)
    req.flash('success', 'Data added successfully');
    res.redirect('/projects-admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add data')
  }
});

app.post('/projects-admin/edit/:id', uploadLogoPicture.single('picture-projects'), async (req, res) => {
  const { id } = req.params;
  const { title, description, technologies, demo_url } = req.body;

  try {
    const oldData = await db.query(`SELECT * FROM projects WHERE id = $1`, [id]);
    const oldLogo = oldData.rows[0].picture;
    const newLogo = req.file ? req.file.filename : oldLogo;
    const techArray = Array.isArray(technologies) ? technologies : [technologies];

    if (req.file && oldLogo) {
      const fs = await import('fs');
      const oldPath = `./src/assets/img/upload_projects/${oldLogo}`;
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const query = `
      UPDATE projects
      SET 
        title = $1,
        description = $2,
        technologies = $3::jsonb,
        demo_url = $4,
        picture = $5
      WHERE id = $6
    `;

    await db.query(query, [
      title,
      description,
      JSON.stringify(techArray),
      demo_url,
      newLogo,
      id
    ]);

    req.flash('success', 'Successfully updated data');
    res.redirect('/projects-admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update data')
  }
});

app.get('/home', redirectIfLoggedIn, async (req, res) => {
  const dataExperiences = await db.query(`SELECT * FROM experiences`);
  const dataProjects = await db.query(`SELECT * FROM projects`);
  res.render('index', {
    title: 'Yuanthio Virly',
    layout: 'layouts/main',
    css: '/assets/css/index.css',
    js: '/assets/js/index.js',
    dataExperiences: dataExperiences.rows,
    dataProjects: dataProjects.rows,
    showNavbar: true
  });
});

app.get('/login', redirectIfLoggedIn, (req, res) => {
  res.render('login', {
    title: 'Login | Yuanthio Virly',
    layout: 'layouts/main',
    css: '/assets/css/login.css',
    msg: req.flash('error')
  });
});

app.get('/experiences-admin', requireLogin, async (req, res) => {
  const dataExperiences = await db.query(`SELECT * FROM experiences`);
  res.render('experiences-admin', {
    title: 'Experiences',
    layout: 'layouts/main',
    css: '/assets/css/experiences-admin.css',
    dataExperiences: dataExperiences.rows,
    msg: req.flash('success'),
    showNavbarAdmin: true
  });
});

app.get('/experiences-admin/edit/:id', async (req, res) => {
  const { id } = req.params;
  const data = await db.query(`SELECT * FROM experiences WHERE id='${id}'`);

  res.render('experiences-admin-edit', {
    title: 'Experiences Edit',
    layout: 'layouts/main',
    css: '/assets/css/experiences-admin-edit.css',
    js: '/assets/js/experiences-admin-edit.js',
    data: data.rows[0],
    showNavbarAdmin: true
  });
});

app.get('/experiences-admin/detail/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const data = await db.query(`SELECT * FROM experiences WHERE id='${id}'`);

  res.render('experiences-admin-detail', {
    title: 'Experiences Detail',
    layout: 'layouts/main',
    css: '/assets/css/experiences-admin-detail.css',
    data: data.rows[0],
    showNavbarAdmin: true
  });
});

app.get('/experiences-admin/delete/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    const companyLogo = await db.query(`SELECT company_logo FROM experiences WHERE id = '${id}'`);
    const filePath = companyLogo.rows[0].company_logo;
    const absolutePath = path.join(
      process.cwd(),
      'src',
      'assets',
      'img',
      'upload_company',
      path.basename(filePath)
    );

    await db.query(`DELETE FROM experiences WHERE id='${id}'`);

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }

    req.flash('success', 'Successfully deleted data');
    res.redirect('/experiences-admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete data');
  }
});

app.get('/experiences-admin-add', requireLogin, (req, res) => {
  res.render('experiences-admin-add', {
    title: 'Experiences Add',
    layout: 'layouts/main',
    css: '/assets/css/experiences-admin-add.css',
    js: 'assets/js/experiences-admin-add.js',
    showNavbarAdmin: true
  });
});

app.get('/projects-admin', requireLogin, async (req, res) => {
  const dataProjects = await db.query(`SELECT * FROM projects`);
  res.render('projects-admin', {
    title: 'Projects',
    layout: 'layouts/main',
    css: '/assets/css/projects-admin.css',
    dataProjects: dataProjects.rows,
    msg: req.flash('success'),
    showNavbarAdmin: true
  });
});

app.get('/projects-admin/edit/:id', async (req, res) => {
  const { id } = req.params;
  const data = await db.query(`SELECT * FROM projects WHERE id='${id}'`);

  res.render('projects-admin-edit', {
    title: 'Projects Edit',
    layout: 'layouts/main',
    css: '/assets/css/projects-admin-edit.css',
    data: data.rows[0],
    showNavbarAdmin: true
  });
});

app.get('/projects-admin/detail/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  const data = await db.query(`SELECT * FROM projects WHERE id='${id}'`);

  res.render('projects-admin-detail', {
    title: 'Projects Detail',
    layout: 'layouts/main',
    css: '/assets/css/projects-admin-detail.css',
    data: data.rows[0],
    showNavbarAdmin: true
  });
});

app.get('/projects-admin/add', requireLogin, (req, res) => {
  res.render('projects-admin-add', {
    title: 'Projects Add',
    layout: 'layouts/main',
    css: '/assets/css/projects-admin-add.css',
    showNavbarAdmin: true
  });
});

app.get('/projects-admin/delete/:id', requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM projects WHERE id='${id}'`);

    req.flash('success', 'Successfully deleted data');
    res.redirect('/projects-admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete data');
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).send('Failed to exit');
    }

    res.redirect('/home');
  });
});

app.get('/testdb', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.send(`Database Connected ${result.rows[0].now}`);
  } catch (err) {
    console.error(err);
    res.status(500).send(`Database not connected`);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

