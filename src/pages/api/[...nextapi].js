import mysql from 'mysql2/promise';
import { parse } from 'url';
import { sign, verify } from 'jsonwebtoken';
import { authMiddleware } from '../../utils/authMiddleware';

const db = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default async function handler(req, res) {
  const { method } = req;
  const { pathname } = parse(req.url, true);

  try {
    switch (method) {
      case 'GET':
        if (pathname === '/api/check-auth') {
          return handleCheckAuth(req, res);
        } else if (pathname === '/api/aproduct') {
          return authMiddleware(handleGetProducts)(req, res);
        } else if (pathname === '/api/astaff') {
          return authMiddleware(handleGetStaff)(req, res);
        } else if (pathname === '/api/acustomer') {
          return authMiddleware(handleGetCustomers)(req, res);
        } else if (pathname === '/api/ainventory') {
          return authMiddleware(handleGetInventory)(req, res);
        }
        break;

        case 'POST':
          if (pathname === '/api/signin') {
            return handleSignIn(req, res);
          } else if (pathname === '/api/validate-pin') {
            return handleValidatePin(req, res);
          } else if (pathname === '/api/logout') {
            return handleLogout(req, res);
          } else if (pathname === '/api/aproduct') {
            return authMiddleware(handleAddProduct)(req, res);
          } else if (pathname === '/api/astaff') {
            return authMiddleware(handleAddStaff)(req, res);
          } else if (pathname === '/api/acustomer') {
            return authMiddleware(handleAddCustomer)(req, res);
          } else if (pathname === '/api/ainventory') {
            return authMiddleware(handleAddInventory)(req, res);
          }
          break;

      case 'PUT':
        if (pathname.startsWith('/api/aproduct/')) {
          const id = pathname.split('/').pop();
          await handleUpdateProduct(req, res, id);
        } else if (pathname.startsWith('/api/astaff/')) {
          const staffId = pathname.split('/').pop(); // kani naay split pop pilion ni niya na row para maka UPDATE ka ani na row sa database astaff
          await handleUpdateStaff(req, res, staffId);
        } else if (pathname.startsWith('/api/acustomer/')) {
          const customerId = pathname.split('/').pop();
          await handleUpdateCustomer(req, res, customerId);
        } else if (pathname.startsWith('/api/ainventory/')) {
          await handleUpdateInventory(req, res);
        }
        break;

      case 'DELETE':
        if (pathname.startsWith('/api/aproduct/')) {
          const id = pathname.split('/').pop();
          await handleDeleteProduct(req, res, id);
        } else if (pathname.startsWith('/api/astaff/')) {
          const staffId = pathname.split('/').pop(); //pilion ni niya na row para maka DELETE ka ani na row sa database astaff
          await handleDeleteStaff(req, res, staffId);
        } else if (pathname.startsWith('/api/acustomer/')) {
          const customerId = pathname.split('/').pop();
          await handleDeleteCustomer(req, res, customerId);
        } else if (pathname.startsWith('/api/ainventory/')) {
          await handleDeleteInventory(req, res);
        }
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
}

// Signin
async function handleSignIn(req, res) {
  const { username, password } = req.body;
  const [result] = await db.query('SELECT * FROM admin WHERE username = ? AND password = ?', [username, password]);

  if (result.length === 0) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const user = result[0];
  const token = sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict`);
  res.status(200).json({ success: true, message: 'Signin successful', username: user.username });
}

// Validate PIN
async function handleValidatePin(req, res) {
  const { pin } = req.body;
  const [result] = await db.query('SELECT * FROM admin WHERE pin = ?', [pin]);

  if (result.length === 0) {
    return res.status(401).json({ error: 'Invalid pin' });
  }

  res.status(200).json({ success: true, message: 'Pin validated successfully' });
}


//Authentication
function handleCheckAuth(req, res) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(200).json({ isAuthenticated: false });
  }

  try {
    verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ isAuthenticated: true });
  } catch (error) {
    return res.status(200).json({ isAuthenticated: false });
  }
}

//Logout
function handleLogout(req, res) {
  res.setHeader('Set-Cookie', 'token=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict');
  res.status(200).json({ success: true, message: 'Logout successful' });
}



// Products
async function handleGetProducts(req, res) {
  try {
    const [products] = await db.query('SELECT * FROM aproduct');
    res.status(200).json(products);
    console.log('Products fetched successfully');
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'An error occurred while fetching products' });
  }
}

async function handleAddProduct(req, res) {
  const { name, price, description } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO aproduct (name, price, description) VALUES (?, ?, ?)',
      [name, price, description]
    );
    res.status(201).json({ id: result.insertId, name, price, description });
    console.log('Product added successfully:', { id: result.insertId, name, price, description });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'An error occurred while adding the product' });
  }
}

async function handleUpdateProduct(req, res, id) {
  const { name, price, description } = req.body;
  try {
    await db.query(
      'UPDATE aproduct SET name = ?, price = ?, description = ? WHERE productid = ?',
      [name, price, description, id]
    );
    res.status(200).json({ id, name, price, description });
    console.log('Product updated successfully:', { id, name, price, description });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'An error occurred while updating the product' });
  }
}

async function handleDeleteProduct(req, res, id) {
  try {
    await db.query('DELETE FROM aproduct WHERE productid = ?', [id]);
    res.status(200).json({ message: 'Product deleted successfully' });
    console.log('Product deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'An error occurred while deleting the product' });
  }
}


// Staff
async function handleGetStaff(req, res) {
  try {
    const [staff] = await db.query('SELECT * FROM astaff');
    res.status(200).json(staff);
    console.log('Staff fetched successfully');
  } catch (error) {
    console.error('Error fetching staff:', error);
    res.status(500).json({ error: 'An error occurred while fetching staff' });
  }
}

async function handleAddStaff(req, res) {
  const { name, position, contact } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO astaff (name, position, contact) VALUES (?, ?, ?)',
      [name, position, contact]
    );
    res.status(201).json({ id: result.insertId, name, position, contact });
    console.log('Staff member added successfully:', { id: result.insertId, name, position, contact });
  } catch (error) {
    console.error('Error adding staff member:', error);
    res.status(500).json({ error: 'An error occurred while adding the staff member' });
  }
}

async function handleUpdateStaff(req, res, id) {
  const { name, position, contact } = req.body;
  try {
    await db.query(
      'UPDATE astaff SET name = ?, position = ?, contact = ? WHERE staffid = ?',
      [name, position, contact, id]
    );
    res.status(200).json({ id, name, position, contact });
    console.log('Staff member updated successfully:', { id, name, position, contact });
  } catch (error) {
    console.error('Error updating staff member:', error);
    res.status(500).json({ error: 'An error occurred while updating the staff member' });
  }
}

async function handleDeleteStaff(req, res, id) {
  try {
    await db.query('DELETE FROM astaff WHERE staffid = ?', [id]);
    res.status(200).json({ message: 'Staff member deleted successfully' });
    console.log('Staff member deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting staff member:', error);
    res.status(500).json({ error: 'An error occurred while deleting the staff member' });
  }
}


// Customers
async function handleGetCustomers(req, res) {
  try {
    const [customers] = await db.query('SELECT * FROM acustomer');
    res.status(200).json(customers);
    console.log('Customers fetched successfully');
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ error: 'An error occurred while fetching customers' });
  }
}

async function handleAddCustomer(req, res) {
  const { name, emailaddress, address, contactNumber } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO acustomer (name, emailaddress, address, contactNumber) VALUES (?, ?, ?)',
      [name, emailaddress, address, contactNumber]
    );
    res.status(201).json({ id: result.insertId, name, emailaddress, address, contactNumber });
    console.log('Customer added successfully:', { id: result.insertId, name, emailaddress, address, contactNumber });
  } catch (error) {
    console.error('Error adding customer:', error);
    res.status(500).json({ error: 'An error occurred while adding the customer' });
  }
}

async function handleUpdateCustomer(req, res, id) {
  const { name, emailaddress, address, contactNumber } = req.body;
  try {
    await db.query(
      'UPDATE acustomer SET name = ?, emailaddress = ?, address = ?, contactNumber = ? WHERE customerid = ?',
      [name, emailaddress, address, contactNumber, id]
    );
    res.status(200).json({ id, name, emailaddress, address, contactNumber });
    console.log('Customer updated successfully:', { id, name, emailaddress, address, contactNumber });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ error: 'An error occurred while updating the customer' });
  }
}

async function handleDeleteCustomer(req, res, id) {
  try {
    await db.query('DELETE FROM acustomer WHERE customerid = ?', [id]);
    res.status(200).json({ message: 'Customer deleted successfully' });
    console.log('Customer deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ error: 'An error occurred while deleting the customer' });
  }
}




// Pwede rani nimo i continue pero inig naa error or dili maka update or delete or add double check lng sa frontend
// ug sa taas ani na declaration katung sa split pop method


/*
async function handleGetInventory(req, res) {
  const [results] = await db.query('SELECT * FROM ainventory');
  res.status(200).json(results);
}

async function handleAddInventory(req, res) {
  const { id, quantity, supplierId, remainingStock, dateAdded, status } = req.body;
  const [result] = await db.query('INSERT INTO ainventory (id, quantity, supplierId, remainingStock, dateAdded, status) VALUES (?, ?, ?, ?, ?, ?)', [id, quantity, supplierId, remainingStock, dateAdded, status]);
  res.status(201).json({ message: 'Inventory item added' });
}

async function handleUpdateInventory(req, res) {
  const { id } = req.query;
  const { quantity, supplierId, remainingStock, dateAdded, status } = req.body;
  const [result] = await db.query('UPDATE ainventory SET quantity = ?, supplierId = ?, remainingStock = ?, dateAdded = ?, status = ? WHERE id = ?', [quantity, supplierId, remainingStock, dateAdded, status, id]);
  res.status(200).json({ message: 'Inventory item updated' });
}

async function handleDeleteInventory(req, res) {
  const { id } = req.query;
  const [result] = await db.query('DELETE FROM ainventory WHERE id = ?', [id]);
  res.status(200).json({ message: 'Inventory item deleted' });
}
*/
