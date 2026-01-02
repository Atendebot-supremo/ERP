import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as db from './db';
import { InsertSetupContract } from '../drizzle/schema';

describe('Installments Regeneration', () => {
  let testContractId: number;

  beforeAll(async () => {
    // Create a test contract
    const testContract: InsertSetupContract = {
      clientId: 1,
      totalAmount: '1000',
      installments: 3,
      installmentAmount: '333.33',
      startDate: new Date('2026-01-01'),
      description: 'Test contract for regeneration',
      status: 'active'
    };

    testContractId = await db.createSetupContract(testContract);
    console.log(`Created test contract with ID: ${testContractId}`);
  });

  it('should create installments automatically when contract is created', async () => {
    const installments = await db.getInstallmentsByContractId(testContractId);
    
    expect(installments.length).toBe(3);
    expect(installments[0].installmentNumber).toBe(1);
    expect(installments[1].installmentNumber).toBe(2);
    expect(installments[2].installmentNumber).toBe(3);
    
    // Check that all installments have valid due dates
    installments.forEach(inst => {
      expect(inst.dueDate).toBeDefined();
      expect(new Date(inst.dueDate).getTime()).toBeGreaterThan(0);
    });
  });

  it('should have correct amounts for each installment', async () => {
    const installments = await db.getInstallmentsByContractId(testContractId);
    
    installments.forEach(inst => {
      // Amount should be approximately 333.33 (1000 / 3)
      const amount = parseFloat(inst.amount);
      expect(amount).toBeGreaterThan(333);
      expect(amount).toBeLessThan(334);
      expect(inst.status).toBe('pending');
    });
  });

  afterAll(async () => {
    // Clean up: delete test contract and its installments
    const installments = await db.getInstallmentsByContractId(testContractId);
    for (const inst of installments) {
      await db.deleteInstallment(inst.id);
    }
    await db.deleteSetupContract(testContractId);
  });
});
