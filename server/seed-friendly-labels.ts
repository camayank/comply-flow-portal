import { pool } from './db';

interface FriendlyLabel {
  ruleCode: string;
  friendlyLabel: string;
  actionVerb: 'upload' | 'review' | 'confirm' | 'pay' | 'sign' | 'verify';
  estimatedTimeMinutes: number;
  whyMatters: {
    benefits: string[];
    socialProof: string;
  };
  instructions: string[];
}

// Top 30 most common compliance requirements with human-friendly labels
const FRIENDLY_LABELS: FriendlyLabel[] = [
  // GST Compliance (Monthly/Quarterly)
  {
    ruleCode: 'GSTR1',
    friendlyLabel: 'Upload sales invoices for GST',
    actionVerb: 'upload',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Avoid ₹10,000 late fee',
        'Complete monthly GST filing',
        'Required for input tax credit claims',
      ],
      socialProof: 'Most businesses complete this in under 5 minutes',
    },
    instructions: [
      'Gather all sales invoices from this month',
      'Upload PDF, Excel, or JSON files',
      'We\'ll file your GST return automatically',
    ],
  },
  {
    ruleCode: 'GSTR3B',
    friendlyLabel: 'Upload purchase invoices for GST',
    actionVerb: 'upload',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Avoid ₹5,000 late fee',
        'Complete monthly GST compliance',
        'Stay compliant with Indian tax laws',
      ],
      socialProof: 'Used by 92% businesses like yours',
    },
    instructions: [
      'Gather all purchase invoices from this month',
      'Upload PDF or Excel files',
      'We\'ll process them within 2 hours',
    ],
  },
  {
    ruleCode: 'GST_PAYMENT',
    friendlyLabel: 'Pay monthly GST liability',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 18% annual interest penalty',
        'Complete monthly GST compliance',
        'Required before filing returns',
      ],
      socialProof: 'Most businesses pay on time to avoid heavy interest',
    },
    instructions: [
      'Review GST liability amount',
      'Pay via GST portal',
      'We\'ll reconcile payment automatically',
    ],
  },
  {
    ruleCode: 'GSTR9',
    friendlyLabel: 'Submit annual GST return',
    actionVerb: 'review',
    estimatedTimeMinutes: 15,
    whyMatters: {
      benefits: [
        'Avoid ₹10,000 late fee',
        'Complete annual GST compliance',
        'Required for businesses over ₹2 crore turnover',
      ],
      socialProof: 'Critical annual filing for GST compliance',
    },
    instructions: [
      'Review drafted annual GST summary',
      'Verify all monthly returns are included',
      'Approve and we\'ll file with GST portal',
    ],
  },

  // Income Tax Compliance
  {
    ruleCode: 'ITR_ADVANCE_TAX_Q1',
    friendlyLabel: 'Pay Q1 advance tax (Apr-Jun)',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 1% monthly interest penalty',
        'Stay compliant with income tax laws',
        'Reduce year-end tax burden',
      ],
      socialProof: '89% businesses pay on time to avoid penalties',
    },
    instructions: [
      'Review estimated Q1 tax amount',
      'Pay via net banking or UPI',
      'We\'ll file the challan automatically',
    ],
  },
  {
    ruleCode: 'ITR_ADVANCE_TAX_Q2',
    friendlyLabel: 'Pay Q2 advance tax (Jul-Sep)',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 1% monthly interest penalty',
        'Stay compliant with income tax laws',
        'Reduce year-end tax burden',
      ],
      socialProof: '89% businesses pay on time to avoid penalties',
    },
    instructions: [
      'Review estimated Q2 tax amount',
      'Pay via net banking or UPI',
      'We\'ll file the challan automatically',
    ],
  },
  {
    ruleCode: 'ITR3',
    friendlyLabel: 'File business tax return',
    actionVerb: 'review',
    estimatedTimeMinutes: 20,
    whyMatters: {
      benefits: [
        'Avoid ₹5,000 late fee',
        'Complete annual income tax compliance',
        'Required for all business income',
      ],
      socialProof: 'Essential annual filing for all businesses',
    },
    instructions: [
      'Review drafted profit & loss statement',
      'Review balance sheet',
      'Approve and we\'ll file with income tax department',
    ],
  },
  {
    ruleCode: 'ITR4',
    friendlyLabel: 'File presumptive taxation return',
    actionVerb: 'review',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Avoid ₹5,000 late fee',
        'Simplified tax filing for small businesses',
        'No need for detailed books',
      ],
      socialProof: 'Popular choice for small businesses under ₹2 crore',
    },
    instructions: [
      'Review total business income',
      'Confirm presumptive income calculation',
      'Approve and we\'ll file automatically',
    ],
  },
  {
    ruleCode: 'TDS_PAYMENT',
    friendlyLabel: 'Pay monthly TDS (tax deducted at source)',
    actionVerb: 'pay',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Avoid 1.5% monthly interest penalty',
        'Stay compliant with income tax laws',
        'Required for vendor/salary payments',
      ],
      socialProof: 'Critical monthly compliance for all businesses',
    },
    instructions: [
      'Review TDS summary',
      'Pay via Challan 281',
      'We\'ll file TDS return automatically',
    ],
  },
  {
    ruleCode: 'TDS_RETURN_Q1',
    friendlyLabel: 'File Q1 TDS return (Apr-Jun)',
    actionVerb: 'review',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Avoid ₹200/day late fee',
        'Required for issuing Form 16/16A',
        'Enables vendor/employee TDS credit claims',
      ],
      socialProof: 'Quarterly compliance for businesses deducting TDS',
    },
    instructions: [
      'Review TDS deductions summary',
      'Verify all deductees details',
      'Approve and we\'ll file via TRACES',
    ],
  },

  // ROC Compliance (Registrar of Companies)
  {
    ruleCode: 'DIR3_KYC',
    friendlyLabel: 'Verify director identity (DIR-3 KYC)',
    actionVerb: 'upload',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Keep director registration active',
        'Avoid DIN deactivation',
        'Required for all company filings',
      ],
      socialProof: 'Annual requirement for all directors in India',
    },
    instructions: [
      'Upload PAN card copy',
      'Upload Aadhaar card copy',
      'Upload recent passport-size photo',
      'We\'ll file DIR-3 KYC within 24 hours',
    ],
  },
  {
    ruleCode: 'AOC4',
    friendlyLabel: 'Submit annual financial statements',
    actionVerb: 'review',
    estimatedTimeMinutes: 15,
    whyMatters: {
      benefits: [
        'Avoid ₹100/day late fee (up to ₹5 lakh)',
        'Complete annual company compliance',
        'Required for bank loans and funding',
      ],
      socialProof: 'Critical filing for all private limited companies',
    },
    instructions: [
      'Review drafted balance sheet',
      'Review profit & loss statement',
      'Approve and we\'ll file with ROC',
    ],
  },
  {
    ruleCode: 'MGT7',
    friendlyLabel: 'Submit annual shareholder report',
    actionVerb: 'review',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Avoid ₹100/day late fee (up to ₹3 lakh)',
        'Complete annual company compliance',
        'Update shareholder information',
      ],
      socialProof: 'Mandatory for all companies, even one-person companies',
    },
    instructions: [
      'Review drafted MGT-7 form',
      'Confirm shareholder details',
      'Approve and we\'ll file with ROC',
    ],
  },
  {
    ruleCode: 'ADT1',
    friendlyLabel: 'Appoint statutory auditor',
    actionVerb: 'review',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Avoid ₹100/day late fee',
        'Required within 30 days of company incorporation',
        'Auditor needed for annual accounts',
      ],
      socialProof: 'One-time filing within first month of company',
    },
    instructions: [
      'Review auditor details',
      'Confirm consent letter received',
      'Approve and we\'ll file ADT-1',
    ],
  },
  {
    ruleCode: 'INC20A',
    friendlyLabel: 'Confirm company registered office',
    actionVerb: 'confirm',
    estimatedTimeMinutes: 2,
    whyMatters: {
      benefits: [
        'Avoid strike-off proceedings',
        'Keep company status active',
        'Required annual confirmation',
      ],
      socialProof: 'Simple annual compliance for all active companies',
    },
    instructions: [
      'Verify registered office address',
      'Confirm it\'s still valid',
      'We\'ll file confirmation with ROC',
    ],
  },

  // Labor Law Compliance
  {
    ruleCode: 'PF_MONTHLY',
    friendlyLabel: 'Upload employee salary details for PF',
    actionVerb: 'upload',
    estimatedTimeMinutes: 8,
    whyMatters: {
      benefits: [
        'Complete employee PF compliance',
        'Avoid interest penalties',
        'Keep employee accounts updated',
      ],
      socialProof: 'Required monthly for companies with 20+ employees',
    },
    instructions: [
      'Upload salary register Excel file',
      'We\'ll calculate PF contributions',
      'We\'ll file ECR return automatically',
    ],
  },
  {
    ruleCode: 'ESI_MONTHLY',
    friendlyLabel: 'Upload employee salary details for ESI',
    actionVerb: 'upload',
    estimatedTimeMinutes: 8,
    whyMatters: {
      benefits: [
        'Complete employee health insurance compliance',
        'Avoid penalties',
        'Keep employee coverage active',
      ],
      socialProof: 'Required monthly for companies with 10+ employees',
    },
    instructions: [
      'Upload salary register Excel file',
      'We\'ll calculate ESI contributions',
      'We\'ll file return automatically',
    ],
  },
  {
    ruleCode: 'PF_PAYMENT',
    friendlyLabel: 'Pay monthly PF contributions',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 12% annual interest penalty',
        'Keep employee PF accounts active',
        'Required by 15th of next month',
      ],
      socialProof: 'Critical payment deadline for PF compliance',
    },
    instructions: [
      'Review total PF contribution amount',
      'Pay via PF portal',
      'We\'ll reconcile payment automatically',
    ],
  },
  {
    ruleCode: 'ESI_PAYMENT',
    friendlyLabel: 'Pay monthly ESI contributions',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 12% annual interest penalty',
        'Keep employee ESI coverage active',
        'Required by 15th of next month',
      ],
      socialProof: 'Critical payment deadline for ESI compliance',
    },
    instructions: [
      'Review total ESI contribution amount',
      'Pay via ESI portal',
      'We\'ll reconcile payment automatically',
    ],
  },
  {
    ruleCode: 'LABOUR_WELFARE_FUND',
    friendlyLabel: 'Pay labour welfare fund contribution',
    actionVerb: 'pay',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Stay compliant with state labour laws',
        'Avoid penalties',
        'Support employee welfare programs',
      ],
      socialProof: 'State-specific annual/biennial contribution',
    },
    instructions: [
      'Review contribution amount',
      'Pay via state labour department portal',
      'We\'ll file proof of payment',
    ],
  },

  // Professional Tax
  {
    ruleCode: 'PT_MONTHLY',
    friendlyLabel: 'Pay monthly professional tax',
    actionVerb: 'pay',
    estimatedTimeMinutes: 3,
    whyMatters: {
      benefits: [
        'Avoid 10% penalty',
        'Stay compliant with state tax laws',
        'Required for employee salaries',
      ],
      socialProof: 'State-specific monthly compliance',
    },
    instructions: [
      'Review professional tax amount',
      'Pay via state tax portal',
      'We\'ll file challan automatically',
    ],
  },

  // Shops & Establishments
  {
    ruleCode: 'SHOPS_ACT_RENEWAL',
    friendlyLabel: 'Renew shops & establishments registration',
    actionVerb: 'review',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Keep business registration active',
        'Required for legal operation',
        'Avoid penalties for lapse',
      ],
      socialProof: 'Annual renewal for shops and commercial establishments',
    },
    instructions: [
      'Review current registration details',
      'Confirm employee count',
      'Approve renewal application',
    ],
  },

  // Trade License
  {
    ruleCode: 'TRADE_LICENSE_RENEWAL',
    friendlyLabel: 'Renew trade license',
    actionVerb: 'review',
    estimatedTimeMinutes: 5,
    whyMatters: {
      benefits: [
        'Keep business legally operational',
        'Required by municipal authorities',
        'Avoid business closure risk',
      ],
      socialProof: 'Annual requirement for most business premises',
    },
    instructions: [
      'Review current trade license',
      'Confirm business activities',
      'Approve renewal application',
    ],
  },

  // Import Export Code (IEC)
  {
    ruleCode: 'IEC_REGISTRATION',
    friendlyLabel: 'Register for Import Export Code',
    actionVerb: 'upload',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Enable international trade',
        'Required for imports/exports',
        'One-time lifetime registration',
      ],
      socialProof: 'Essential for businesses trading internationally',
    },
    instructions: [
      'Upload PAN card',
      'Upload bank certificate',
      'Upload business registration proof',
      'We\'ll file IEC application',
    ],
  },

  // MSME Registration
  {
    ruleCode: 'MSME_UDYAM_REGISTRATION',
    friendlyLabel: 'Register for MSME Udyam certificate',
    actionVerb: 'upload',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Get priority sector lending benefits',
        'Avail government subsidies',
        'Get protection against delayed payments',
      ],
      socialProof: 'Free registration with significant benefits for MSMEs',
    },
    instructions: [
      'Upload Aadhaar card',
      'Upload business PAN',
      'Provide investment and turnover details',
      'We\'ll complete registration',
    ],
  },

  // FSSAI (Food License)
  {
    ruleCode: 'FSSAI_LICENSE',
    friendlyLabel: 'Obtain food safety license (FSSAI)',
    actionVerb: 'upload',
    estimatedTimeMinutes: 15,
    whyMatters: {
      benefits: [
        'Legally sell food products',
        'Build customer trust',
        'Avoid ₹5 lakh penalty',
      ],
      socialProof: 'Mandatory for all food businesses',
    },
    instructions: [
      'Upload premises photos',
      'Upload food safety plan',
      'Upload business registration',
      'We\'ll file FSSAI application',
    ],
  },

  // GST Registration
  {
    ruleCode: 'GST_REGISTRATION',
    friendlyLabel: 'Register for GST',
    actionVerb: 'upload',
    estimatedTimeMinutes: 15,
    whyMatters: {
      benefits: [
        'Legally collect GST from customers',
        'Claim input tax credit',
        'Required for turnover over ₹40 lakh',
      ],
      socialProof: 'Essential registration for growing businesses',
    },
    instructions: [
      'Upload PAN card',
      'Upload business address proof',
      'Upload bank account details',
      'We\'ll complete GST registration',
    ],
  },

  // Annual Compliance Bundle
  {
    ruleCode: 'ANNUAL_COMPLIANCE_BUNDLE',
    friendlyLabel: 'Review annual compliance checklist',
    actionVerb: 'review',
    estimatedTimeMinutes: 20,
    whyMatters: {
      benefits: [
        'Ensure all annual filings are complete',
        'Avoid any missed deadlines',
        'Stay fully compliant',
      ],
      socialProof: 'Comprehensive annual review for peace of mind',
    },
    instructions: [
      'Review ROC filings status',
      'Review income tax filing status',
      'Review GST annual return status',
      'Confirm all compliance items',
    ],
  },

  // Quarterly Compliance Bundle
  {
    ruleCode: 'QUARTERLY_COMPLIANCE_BUNDLE',
    friendlyLabel: 'Review quarterly compliance checklist',
    actionVerb: 'review',
    estimatedTimeMinutes: 10,
    whyMatters: {
      benefits: [
        'Ensure all quarterly filings are complete',
        'Stay ahead of deadlines',
        'Maintain good standing',
      ],
      socialProof: 'Regular check-in to stay on track',
    },
    instructions: [
      'Review TDS return status',
      'Review advance tax payment status',
      'Review GST returns status',
      'Confirm all items',
    ],
  },
];

async function seedFriendlyLabels() {
  console.log('🌱 Seeding friendly labels for compliance rules...\n');
  console.log(`Total labels to process: ${FRIENDLY_LABELS.length}\n`);

  let updated = 0;
  let inserted = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const label of FRIENDLY_LABELS) {
    try {
      // Check if rule exists
      const checkResult = await pool.query(
        'SELECT id, compliance_name FROM compliance_rules WHERE rule_code = $1',
        [label.ruleCode]
      );

      if (checkResult.rowCount > 0) {
        // Update existing rule
        const result = await pool.query(
          `UPDATE compliance_rules 
           SET friendly_label = $1,
               action_verb = $2,
               estimated_time_minutes = $3,
               why_matters = $4,
               instructions = $5,
               updated_at = NOW()
           WHERE rule_code = $6
           RETURNING id, compliance_name`,
          [
            label.friendlyLabel,
            label.actionVerb,
            label.estimatedTimeMinutes,
            JSON.stringify(label.whyMatters),
            label.instructions,
            label.ruleCode,
          ]
        );

        console.log(`✅ ${label.ruleCode}: ${label.friendlyLabel}`);
        updated++;
      } else {
        // Insert as new rule if doesn't exist
        const result = await pool.query(
          `INSERT INTO compliance_rules (
            rule_code, regulation_category, compliance_name, friendly_label, action_verb, 
            estimated_time_minutes, why_matters, instructions,
            periodicity, due_date_calculation_type, due_date_formula, 
            applicable_entity_types, priority_level, penalty_risk_level,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
          RETURNING id`,
          [
            label.ruleCode,
            'GENERAL',
            label.friendlyLabel,
            label.friendlyLabel,
            label.actionVerb,
            label.estimatedTimeMinutes,
            JSON.stringify(label.whyMatters),
            label.instructions,
            'MONTHLY',
            'FIXED',
            JSON.stringify({ day: 20, month: 0 }),
            JSON.stringify(['PRIVATE_LIMITED', 'LLP', 'PROPRIETORSHIP']),
            'medium',
            'medium',
          ]
        );

        console.log(`✨ ${label.ruleCode}: Created new rule with friendly label`);
        inserted++;
      }
    } catch (error: any) {
      console.error(`❌ ${label.ruleCode}: Error - ${error.message}`);
      errors.push(`${label.ruleCode}: ${error.message}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ✨ Inserted: ${inserted}`);
  console.log(`   ⚠️  Not found: ${notFound}`);
  console.log(`   ❌ Errors: ${errors.length}`);
  console.log(`   📦 Total: ${FRIENDLY_LABELS.length}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Error details:`);
    errors.forEach((err) => console.log(`   ${err}`));
  }

  // Verification query
  console.log('\n🔍 Verification:');
  const verifyResult = await pool.query(
    `SELECT rule_code, friendly_label, action_verb, estimated_time_minutes 
     FROM compliance_rules 
     WHERE friendly_label IS NOT NULL 
     ORDER BY rule_code 
     LIMIT 10`
  );

  console.log('\nFirst 10 rules with friendly labels:');
  verifyResult.rows.forEach((row: any) => {
    console.log(`   ${row.rule_code}: ${row.friendly_label} (${row.action_verb}, ${row.estimated_time_minutes} min)`);
  });
}

// Run the seed
seedFriendlyLabels()
  .then(() => {
    console.log('\n✅ Seed completed successfully');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    pool.end();
    process.exit(1);
  });
