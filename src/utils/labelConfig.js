export const LABEL_CONFIG = {
  // Printer physical capabilities
  printerWidth: '80mm',
  
  // The roll media
  rollWidth: '58mm',
  
  // Roll placement in printer: 'center' or 'left'
  rollPlacement: 'center',

  // Layout calculations
  // We use 58mm roll but there should be a 1mm gap on edges
  // 58mm - 2mm margin = 56mm usable
  // 56mm / 2 = 28mm per label
  usableWidth: '56mm',
  labelWidth: '28mm', 
  labelHeight: '25mm',
  
  // Safe limits (to prevent overflow)
  maxMedicineNameLines: 2,
  
  fonts: {
    nameMax: '9px',
    nameMin: '6.5px',
    mrp: '7.5px',
    barcodeText: '7px'
  }
};
