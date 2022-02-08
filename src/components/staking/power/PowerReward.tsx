import { useTranslation } from 'react-i18next';
import { usePower } from '../../../hooks';
import { Fund } from '../../../model';

interface PowerRewardProps {
  selectedAsset: Fund | null;
}

export function PowerReward({ selectedAsset }: PowerRewardProps) {
  const { t } = useTranslation();
  const { calcPower } = usePower();
  const power = calcPower(selectedAsset);

  return selectedAsset && Number(power) > 0 ? <p>{t('You will get {{amount}} Power', { amount: power })}</p> : null;
}