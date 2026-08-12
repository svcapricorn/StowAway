// StowAway Tracker - Regulatory Templates Page
// Non-enforcing reference templates from maritime authorities

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { RegulatoryTemplate } from '@/types';

// Reference templates - guidance only
const TEMPLATES: RegulatoryTemplate[] = [
  {
    id: 'uscg-recreational',
    name: 'USCG Recreational First Aid Kit',
    source: 'U.S. Coast Guard',
    description: 'Basic first aid recommendations for recreational vessels.',
    disclaimer: 'This is a reference only. Actual requirements may vary. Always verify with current USCG regulations.',
    items: [
      { name: 'Adhesive bandages (assorted)', category: 'first-aid', recommendedQuantity: 20 },
      { name: 'Sterile gauze pads (4x4)', category: 'first-aid', recommendedQuantity: 12 },
      { name: 'Adhesive tape (1" roll)', category: 'first-aid', recommendedQuantity: 2 },
      { name: 'Elastic bandage (3")', category: 'first-aid', recommendedQuantity: 2 },
      { name: 'Triangular bandage', category: 'first-aid', recommendedQuantity: 2 },
      { name: 'Scissors', category: 'tools', recommendedQuantity: 1 },
      { name: 'Tweezers', category: 'tools', recommendedQuantity: 1 },
      { name: 'Antiseptic wipes', category: 'hygiene', recommendedQuantity: 20 },
      { name: 'Pain reliever (Ibuprofen/Acetaminophen)', category: 'medications', recommendedQuantity: 24 },
      { name: 'Antihistamine', category: 'medications', recommendedQuantity: 12 },
    ],
  },
  {
    id: 'rya-offshore',
    name: 'RYA Offshore Medical Kit',
    source: 'Royal Yachting Association',
    description: 'Recommended medical supplies for offshore passages (Category 2).',
    disclaimer: 'Reference guide only. Consult RYA publications for complete current requirements.',
    items: [
      { name: 'Wound dressings (sterile, assorted)', category: 'first-aid', recommendedQuantity: 10 },
      { name: 'Burn dressings', category: 'first-aid', recommendedQuantity: 4 },
      { name: 'Splint (SAM splint or similar)', category: 'tools', recommendedQuantity: 1 },
      { name: 'Steri-strips', category: 'first-aid', recommendedQuantity: 20 },
      { name: 'Seasickness medication', category: 'medications', recommendedQuantity: 12 },
      { name: 'Rehydration salts', category: 'medications', recommendedQuantity: 6 },
      { name: 'Broad-spectrum antibiotic', category: 'medications', recommendedQuantity: 1, notes: 'Prescription required' },
      { name: 'Thermometer (digital)', category: 'tools', recommendedQuantity: 1 },
      { name: 'CPR pocket mask', category: 'emergency', recommendedQuantity: 1 },
    ],
  },
  {
    id: 'who-ship-chest',
    name: 'WHO Ship\'s Medicine Chest (Lite)',
    source: 'World Health Organization',
    description: 'Simplified reference based on WHO International Medical Guide for Ships.',
    disclaimer: 'This is a simplified reference only. The complete WHO guide contains additional requirements based on voyage type and crew size.',
    items: [
      { name: 'Oral rehydration salts', category: 'medications', recommendedQuantity: 20 },
      { name: 'Paracetamol 500mg', category: 'medications', recommendedQuantity: 100 },
      { name: 'Loperamide 2mg', category: 'medications', recommendedQuantity: 20 },
      { name: 'Chlorpheniramine 4mg', category: 'medications', recommendedQuantity: 20 },
      { name: 'Hydrocortisone cream 1%', category: 'medications', recommendedQuantity: 2 },
      { name: 'Eye wash solution', category: 'hygiene', recommendedQuantity: 2 },
      { name: 'Suture kit (disposable)', category: 'tools', recommendedQuantity: 2 },
      { name: 'Blood pressure monitor', category: 'tools', recommendedQuantity: 1 },
    ],
  },
];

export default function TemplatesPage() {
  const navigate = useNavigate();

  return (
    <div className="container py-6 space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="-ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Regulatory Templates</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Reference guides from maritime authorities
        </p>
      </div>

      {/* Important Disclaimer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-maritime p-4 bg-warning/10 border-warning/30"
      >
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-foreground">Reference Only</h3>
            <p className="text-sm text-muted-foreground mt-1">
              These templates are for guidance purposes only and are not a substitute 
              for official regulations. Requirements vary by vessel type, voyage, 
              and jurisdiction. Always consult current official publications and 
              qualified maritime medical advisors.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Templates List */}
      <div className="space-y-4">
        {TEMPLATES.map((template, index) => (
          <TemplateCard key={template.id} template={template} index={index} />
        ))}
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: RegulatoryTemplate;
  index: number;
}

function TemplateCard({ template, index }: TemplateCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="card-maritime overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium">{template.name}</h3>
            <p className="text-sm text-muted-foreground">{template.source}</p>
            <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
          </div>
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border"
        >
          <div className="p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground italic mb-4">
              ⚠️ {template.disclaimer}
            </p>
            
            <h4 className="font-medium text-sm mb-3">Recommended Items ({template.items.length})</h4>
            
            <div className="space-y-2">
              {template.items.map((item, i) => (
                <div 
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm">{item.name}</span>
                    {item.notes && (
                      <span className="text-xs text-muted-foreground ml-2">({item.notes})</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ×{item.recommendedQuantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
