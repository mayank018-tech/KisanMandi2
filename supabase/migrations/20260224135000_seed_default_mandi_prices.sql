-- Seed default mandi prices for Gujarat markets.
-- Idempotent insert: avoids duplicates by crop/location/mandi/date.

with seed_data (crop_name, state, district, mandi_name, min_price, max_price, average_price, price_date) as (
  values
    ('Cotton', 'Gujarat', 'Rajkot', 'Rajkot Yard', 6480, 7220, 6860, current_date),
    ('Groundnut', 'Gujarat', 'Junagadh', 'Junagadh APMC', 5120, 5890, 5530, current_date),
    ('Wheat', 'Gujarat', 'Ahmedabad', 'Ahmedabad APMC', 2360, 2580, 2470, current_date),
    ('Maize', 'Gujarat', 'Dahod', 'Dahod Mandi', 1870, 2140, 2000, current_date),
    ('Bajra', 'Gujarat', 'Banaskantha', 'Palanpur APMC', 2140, 2410, 2270, current_date),
    ('Castor Seed', 'Gujarat', 'Mehsana', 'Unjha APMC', 5600, 6240, 5920, current_date),
    ('Cumin (Jeera)', 'Gujarat', 'Patan', 'Unjha APMC', 18000, 21300, 19600, current_date),
    ('Coriander', 'Gujarat', 'Rajkot', 'Gondal Mandi', 6400, 7420, 6890, current_date),
    ('Onion', 'Gujarat', 'Bhavnagar', 'Bhavnagar APMC', 1320, 2070, 1690, current_date),
    ('Potato', 'Gujarat', 'Sabarkantha', 'Himatnagar APMC', 980, 1520, 1240, current_date),
    ('Tomato', 'Gujarat', 'Surat', 'Surat APMC', 900, 1710, 1290, current_date),
    ('Chana', 'Gujarat', 'Amreli', 'Amreli Mandi', 5210, 5780, 5490, current_date),
    ('Mustard', 'Gujarat', 'Kheda', 'Nadiad APMC', 5360, 5970, 5660, current_date),
    ('Soybean', 'Gujarat', 'Vadodara', 'Vadodara APMC', 4020, 4590, 4310, current_date),
    ('Tur (Arhar)', 'Gujarat', 'Anand', 'Anand Mandi', 6480, 7220, 6850, current_date),

    ('Cotton', 'Gujarat', 'Amreli', 'Amreli APMC', 6390, 7090, 6720, current_date - 1),
    ('Groundnut', 'Gujarat', 'Rajkot', 'Rajkot Yard', 5070, 5830, 5470, current_date - 1),
    ('Wheat', 'Gujarat', 'Vadodara', 'Padra APMC', 2320, 2540, 2430, current_date - 1),
    ('Maize', 'Gujarat', 'Panchmahal', 'Godhra Mandi', 1820, 2100, 1950, current_date - 1),
    ('Bajra', 'Gujarat', 'Jamnagar', 'Jamnagar APMC', 2090, 2360, 2230, current_date - 1),
    ('Castor Seed', 'Gujarat', 'Banaskantha', 'Deesa APMC', 5520, 6170, 5860, current_date - 1),
    ('Cumin (Jeera)', 'Gujarat', 'Mehsana', 'Unjha APMC', 17650, 20800, 19120, current_date - 1),
    ('Coriander', 'Gujarat', 'Surendranagar', 'Surendranagar APMC', 6280, 7310, 6760, current_date - 1),
    ('Onion', 'Gujarat', 'Ahmedabad', 'Ahmedabad APMC', 1260, 1990, 1630, current_date - 1),
    ('Potato', 'Gujarat', 'Kheda', 'Nadiad APMC', 940, 1470, 1190, current_date - 1),
    ('Tomato', 'Gujarat', 'Navsari', 'Navsari APMC', 860, 1650, 1240, current_date - 1),
    ('Chana', 'Gujarat', 'Bhavnagar', 'Mahuva APMC', 5150, 5720, 5420, current_date - 1),
    ('Mustard', 'Gujarat', 'Patan', 'Siddhpur APMC', 5290, 5890, 5590, current_date - 1),
    ('Soybean', 'Gujarat', 'Bharuch', 'Bharuch Mandi', 3950, 4510, 4240, current_date - 1),
    ('Tur (Arhar)', 'Gujarat', 'Surat', 'Surat APMC', 6410, 7140, 6780, current_date - 1),

    ('Cotton', 'Gujarat', 'Surendranagar', 'Surendranagar APMC', 6310, 7010, 6650, current_date - 2),
    ('Groundnut', 'Gujarat', 'Porbandar', 'Porbandar Mandi', 4990, 5750, 5380, current_date - 2),
    ('Wheat', 'Gujarat', 'Mehsana', 'Visnagar APMC', 2290, 2510, 2400, current_date - 2),
    ('Maize', 'Gujarat', 'Aravalli', 'Modasa Mandi', 1790, 2060, 1920, current_date - 2),
    ('Bajra', 'Gujarat', 'Kutch', 'Bhuj APMC', 2050, 2320, 2190, current_date - 2),
    ('Castor Seed', 'Gujarat', 'Patan', 'Patan APMC', 5460, 6110, 5790, current_date - 2),
    ('Cumin (Jeera)', 'Gujarat', 'Banaskantha', 'Palanpur APMC', 17320, 20450, 18880, current_date - 2),
    ('Coriander', 'Gujarat', 'Jamnagar', 'Jamnagar APMC', 6190, 7210, 6690, current_date - 2),
    ('Onion', 'Gujarat', 'Rajkot', 'Gondal Mandi', 1210, 1930, 1570, current_date - 2),
    ('Potato', 'Gujarat', 'Anand', 'Anand Mandi', 910, 1420, 1160, current_date - 2),
    ('Tomato', 'Gujarat', 'Vadodara', 'Vadodara APMC', 830, 1590, 1190, current_date - 2),
    ('Chana', 'Gujarat', 'Junagadh', 'Junagadh APMC', 5090, 5650, 5350, current_date - 2),
    ('Mustard', 'Gujarat', 'Ahmedabad', 'Bavla APMC', 5230, 5820, 5520, current_date - 2),
    ('Soybean', 'Gujarat', 'Surendranagar', 'Limbdi APMC', 3890, 4440, 4160, current_date - 2),
    ('Tur (Arhar)', 'Gujarat', 'Bhavnagar', 'Bhavnagar APMC', 6350, 7070, 6710, current_date - 2)
)
insert into public.mandi_prices (
  crop_name,
  state,
  district,
  mandi_name,
  min_price,
  max_price,
  average_price,
  price_date
)
select
  s.crop_name,
  s.state,
  s.district,
  s.mandi_name,
  s.min_price,
  s.max_price,
  s.average_price,
  s.price_date
from seed_data s
where not exists (
  select 1
  from public.mandi_prices m
  where m.crop_name = s.crop_name
    and m.state = s.state
    and m.district = s.district
    and m.mandi_name = s.mandi_name
    and m.price_date = s.price_date
);
