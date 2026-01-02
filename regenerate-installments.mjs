import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'test',
});

try {
  // Get all setup contracts
  const [contracts] = await connection.query('SELECT * FROM setupContracts');
  
  console.log(`Found ${contracts.length} contracts`);
  
  for (const contract of contracts) {
    console.log(`\nProcessing contract ${contract.id} (${contract.clientId})`);
    
    // Delete existing installments for this contract
    await connection.query('DELETE FROM installments WHERE contractId = ?', [contract.id]);
    
    // Generate new installments
    const startDate = new Date(contract.startDate);
    const numberOfInstallments = contract.installments || 1;
    const amountPerInstallment = parseFloat(contract.totalAmount) / numberOfInstallments;
    
    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      
      await connection.query(
        'INSERT INTO installments (contractId, installmentNumber, amount, dueDate, status) VALUES (?, ?, ?, ?, ?)',
        [contract.id, i + 1, amountPerInstallment.toFixed(2), dueDate, 'pending']
      );
      
      console.log(`  Installment ${i + 1}: R$ ${amountPerInstallment.toFixed(2)} on ${dueDate.toLocaleDateString('pt-BR')}`);
    }
  }
  
  console.log('\n✅ All installments regenerated successfully!');
} catch (error) {
  console.error('Error:', error);
} finally {
  await connection.end();
}
