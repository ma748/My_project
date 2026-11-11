export const feeDetailsRows = [
  { year: '2nd year Regular', branch: 'CSE/E&C/ECE/EEE', tuition: 33150, admission: 3560, insurance: 670, pd: 330, total: 37710 },
  { year: '2nd year Regular', branch: 'CV/ME', tuition: 17300, admission: 3560, insurance: 670, pd: 330, total: 21860 },
  { year: '3rd year Regular', branch: 'CSE/E&C/ECE/EEE', tuition: 30916, admission: 3560, insurance: 670, pd: 330, total: 35476 },
  { year: '3rd year Lateral', branch: 'CSE/E&C/ECE/EEE', tuition: 33800, admission: 3560, insurance: 670, pd: 330, total: 38360 },
  { year: '3rd year Lateral', branch: 'CV/ME', tuition: 17300, admission: 3560, insurance: 670, pd: 330, total: 21860 },
  { year: '4th year Regular', branch: 'All branches', tuition: 28910, admission: 3560, insurance: 570, pd: 330, total: 33370 },
  { year: '4th year Lateral', branch: 'All branches', tuition: 32960, admission: 3560, insurance: 570, pd: 330, total: 37420 }
];

export const formatRupees = (amount) => `₹${amount.toLocaleString('en-IN')}`;
