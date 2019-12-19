
var mysql = require('mysql');
var inquirer = require('inquirer');
var Table = require('cli-table');
//create the connection to the db
// also could not figure out to change password 
var connection = mysql.createConnection({
    host: '',
    user: 'root',
    password: 'password',
    database: 'bamazon'
});

connection.connect((err) => {
    if (err) throw err;
    console.log('Connection successful');
    resetData();
    displayMenu();
});


var itemToUpdate = {};
var itemToDelete = {};

var resetData = function() {
    itemToUpdate = {};
    itemToDelete = {};
}

var displayMenu = function() {
    inquirer.prompt({
        name: 'action',
        type: 'rawlist',
        message: '\n\nChoose an action:',
        choices: [
            'View Products for Sale',
            'View Low Inventory',
            'Add to Inventory',
            'Add New Product',
            'Remove A Product'
        ]
    }).then((answer) => {
        switch (answer.action) {
            case 'View Products for Sale':
                viewActiveProducts();
            break;
            case 'View Low Inventory':
                viewLowInventory();
            break;
            case 'Add to Inventory':
                addToInventory();
            break;
            case 'Add New Product':
                addNewProduct();
            break;
            case 'Remove A Product':
                deleteProduct();
            break;
        }
    });
};

var viewActiveProducts = function() {
    connection.query(`SELECT * FROM products`, (err, res) => {
        var listTable = new Table({
            head: ['Item ID', 'Product Name', 'In Stock', 'Price'],
            colWidths: [10, 45, 10, 12]
        });

        for (var i = 0; i < res.length; i++) {
            listTable.push([res[i].item_id, res[i].product_name, res[i].stock_quantity, `$${res[i].price}`]);
        }

        console.log(`\n\n${listTable.toString()}\n\n`);
        connection.end();
    });
};

var viewLowInventory = function() {
    connection.query(`SELECT * FROM products WHERE stock_quantity < 5 ORDER BY stock_quantity DESC`, (err, res) => {
        if (res.length > 0) {
            var listTable = new Table({
                head: ['Item ID', 'Product Name', 'In Stock', 'Price'],
                colWidths: [10, 45, 10, 12]
            });

            for (var i = 0; i < res.length; i++) {
                listTable.push([res[i].item_id, res[i].product_name, res[i].stock_quantity, `$${res[i].price}`]);
            }
            console.log(`\n\n${listTable.toString()}\n\n`);

        } else {
            console.log(('\n\tNo low-stock items!\n'));
        }
        connection.end();
    });
};

var addToInventory = function() {
    codeEmployee();
};

var addNewProduct = function() {
    inquirer.prompt([
        {
            name: 'name',
            type: 'input',
            message: 'Enter the product name:'
        },
        {
            name: 'department',
            type: 'input',
            message: 'Enter the product department:'
        },
        {
            name: 'price',
            type: 'input',
            message: 'Enter the product price:',
            validate: (value) => {
                if (!isNaN(value) && value > 0) {
                    return true;
                } else {
                    console.log((` => Oops, please enter a number greater than 0`));
                    return false;
                }
            }
        }, 
        {
            name: 'stockNum',
            type: 'input',
            message: 'Enter the number of items in stock:',
            validate: (value) => {
                if (!isNaN(value) && value > 0) {
                    return true;
                } else {
                    console.log((` => Oops, please enter a number greater than 0`));
                    return false;
                }
            }
        }
    ]).then((answers) => {
        connection.query('INSERT INTO products SET ?', {
            product_name: answers.name,
            department_name: answers.department,
            price: answers.price,
            stock_quantity: answers.stockNum
        }, (err, res) => {
            if (err) throw err;
            console.log(('\n\tItem successfully added!'));
            viewActiveProducts();
        });
    });
};

var deleteProduct = function() {
    inquirer.prompt({
        name: 'itemID',
        type: 'input',
        message: 'Enter the ID of the product you\'d like to remove:'
    }).then((answer) => {
        connection.query('SELECT * FROM products WHERE ?', { item_id: answer.itemID }, (err, res) => {
            inquirer.prompt({
                name: 'confirm',
                type: 'confirm',
                message: `You would like to delete` + (` '${res[0].product_name}'. `) + `Is this correct?`
            }).then((answer) => {
                if (answer.confirm) {
                    itemToDelete = {
                        item_id: res[0].item_id
                    };
                    connection.query('DELETE FROM products WHERE ?', { item_id: itemToDelete.item_id }, (err, res) => {
                        if (err) throw err;
                        console.log(('\n\tItem successfully removed!'));
                        viewActiveProducts();
                    });
                } else {
                    deleteProduct();
                }
            });
        });
    });
};

var codeEmployee = function() {
    inquirer.prompt({
        name: 'itemID',
        type: 'input',
        message: 'Enter the ID of the item you\'d like to update:',
        validate: (value) => {
            if (!isNaN(value) && (value > 0 && value <= 10)) {
                return true;
            } else {
                console.log((' => Please enter a number from 1-10'));
                return false;
            }
        }
    }).then((answer) => {
        connection.query('SELECT * FROM products WHERE ?', { item_id: answer.itemID }, (err, res) => {
            confirmItem(res[0].product_name, res);
        });
    });
};

var confirmItem = function(product, object) {
    inquirer.prompt({
        name: 'confirmItem',
        type: 'confirm',
        message: `You chose` + (` '${product}'. `) + `Is this correct?`
    }).then((answer) => {
        if (answer.confirmItem) {
            itemToUpdate = {
                item_id: object[0].item_id,
                product_name: object[0].product_name,
                department_name: object[0].department_name,
                price: object[0].price,
                stock_quantity: object[0].stock_quantity,
                product_sales: object[0].product_sales
            };
            howManySelected();
        } else {
            codeEmployee();
        }
    });
};

var howManySelected = function() {
    inquirer.prompt({
        name: 'howMany',
        type: 'input',
        message: 'Enter the quantity you would like to add:',
        validate: (value) => {
            if (!isNaN(value) && value > 0) {
                return true;
            } else {
                console.log((' => Oops, please enter a number greater than 0'));
                return false;
            }
        }
    }).then((answer) => {
        itemToUpdate.howMany = answer.howMany;
        connection.query('UPDATE products SET ? WHERE ?', [
            {
                stock_quantity: Number(itemToUpdate.stock_quantity) + Number(answer.howMany)
            },
            {
                item_id: itemToUpdate.item_id
            }
        ], (err, res) => {
            console.log((`\n\tInventory updated! '${itemToUpdate.product_name}' now has ${Number(itemToUpdate.stock_quantity) + Number(itemToUpdate.howMany)} items in stock\n`));
            connection.end();
        });
    });
}